import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth/session";

/**
 * TEMPORARY admin dev-bypass login.
 * Active only when DEV_ADMIN_BYPASS_SECRET env var is set.
 * Visit: /api/auth/admin/dev-login?secret=<value>
 *
 * Remove this route once a real KOBIL Identity admin user exists.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.DEV_ADMIN_BYPASS_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "Dev bypass disabled (set DEV_ADMIN_BYPASS_SECRET to enable)" },
      { status: 404 },
    );
  }

  const got = req.nextUrl.searchParams.get("secret");
  if (got !== expected) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  await setSession("admin", {
    role: "admin",
    admin: {
      sub: "dev-admin",
      email: "dev-admin@terbuch.local",
      name: "Dev Admin",
    },
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  });

  return NextResponse.redirect(new URL("/admin", req.url));
}
