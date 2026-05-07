import { NextRequest, NextResponse } from "next/server";
import * as oidc from "openid-client";
import { oidcConfig } from "@/lib/auth/oidc";
import {
  clearFlowCookie,
  readFlowCookie,
  setSession,
} from "@/lib/auth/session";
import { mapUserClaims } from "@/lib/auth/claims";

export async function GET(req: NextRequest) {
  const flow = await readFlowCookie("user");
  if (!flow) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const config = await oidcConfig("user");
  const tokens = await oidc.authorizationCodeGrant(config, new URL(req.url), {
    pkceCodeVerifier: flow.pkceVerifier,
    expectedState: flow.state,
  });

  const claims = (tokens.claims() ?? {}) as Record<string, unknown>;
  let merged: Record<string, unknown> = { ...claims };

  if (tokens.access_token) {
    try {
      const userInfo = await oidc.fetchUserInfo(
        config,
        tokens.access_token,
        typeof claims.sub === "string" ? claims.sub : "",
      );
      merged = { ...merged, ...userInfo };
    } catch {
      // userinfo optional; ignore failure
    }
  }

  const mapped = mapUserClaims(merged);
  if (!mapped.sub) {
    return NextResponse.redirect(new URL("/?err=no_sub", req.url));
  }

  await setSession("user", {
    role: "user",
    user: mapped,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  });
  await clearFlowCookie("user");

  return NextResponse.redirect(new URL(flow.returnTo ?? "/", req.url));
}
