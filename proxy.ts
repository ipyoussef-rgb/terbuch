import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const USER_PROTECTED = ["/", "/service", "/office", "/slots", "/book", "/booking"];
const ADMIN_PROTECTED_PREFIX = "/admin";
const ADMIN_OPEN = ["/admin/login"];

function key(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? "";
  return new TextEncoder().encode(secret);
}

async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow Next internals & static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/admin/chat-webhook") ||
    pathname.startsWith("/api/cron") ||
    pathname === "/favicon.ico" ||
    pathname === "/datenschutz"
  ) {
    return NextResponse.next();
  }

  // Admin section
  if (pathname.startsWith(ADMIN_PROTECTED_PREFIX)) {
    if (ADMIN_OPEN.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next();
    }
    const token = req.cookies.get("terbuch_admin_session")?.value;
    if (!(await hasValidSession(token))) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("returnTo", pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Admin API routes (excluding webhook handled above)
  if (pathname.startsWith("/api/admin")) {
    const token = req.cookies.get("terbuch_admin_session")?.value;
    if (!(await hasValidSession(token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // User-facing pages and APIs
  const needsUserAuth =
    USER_PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/api/appointments") ||
    pathname.startsWith("/api/offices") ||
    pathname.startsWith("/api/slots");

  if (needsUserAuth) {
    const token = req.cookies.get("terbuch_user_session")?.value;
    if (!(await hasValidSession(token))) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/api/auth/user/login";
      url.searchParams.set("returnTo", pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf)$).*)"],
};
