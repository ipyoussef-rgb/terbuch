import { NextRequest, NextResponse } from "next/server";
import * as oidc from "openid-client";
import { oidcConfig } from "@/lib/auth/oidc";
import {
  clearFlowCookie,
  readFlowCookie,
  setSession,
} from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const flow = await readFlowCookie("admin");
  if (!flow) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const config = await oidcConfig("admin");
  const tokens = await oidc.authorizationCodeGrant(config, new URL(req.url), {
    pkceCodeVerifier: flow.pkceVerifier,
    expectedState: flow.state,
  });

  const claims = (tokens.claims() ?? {}) as Record<string, unknown>;
  const sub = typeof claims.sub === "string" ? claims.sub : "";
  if (!sub) {
    return NextResponse.redirect(new URL("/admin/login?err=no_sub", req.url));
  }

  await setSession("admin", {
    role: "admin",
    admin: {
      sub,
      email: typeof claims.email === "string" ? claims.email : undefined,
      name:
        typeof claims.name === "string"
          ? claims.name
          : typeof claims.preferred_username === "string"
            ? claims.preferred_username
            : undefined,
    },
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  });
  await clearFlowCookie("admin");

  return NextResponse.redirect(new URL(flow.returnTo ?? "/admin", req.url));
}
