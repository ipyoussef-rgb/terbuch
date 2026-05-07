import { NextRequest, NextResponse } from "next/server";
import * as oidc from "openid-client";
import { oidcConfig, oidcScope, redirectUri } from "@/lib/auth/oidc";
import { setFlowCookie } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const config = await oidcConfig("admin");
  const verifier = oidc.randomPKCECodeVerifier();
  const challenge = await oidc.calculatePKCECodeChallenge(verifier);

  const params: Record<string, string> = {
    redirect_uri: redirectUri("admin"),
    scope: oidcScope("admin"),
    code_challenge: challenge,
    code_challenge_method: "S256",
  };

  let state: string | undefined;
  if (!config.serverMetadata().supportsPKCE()) {
    state = oidc.randomState();
    params.state = state;
  }

  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "/admin";
  await setFlowCookie("admin", { pkceVerifier: verifier, state, returnTo });

  const url = oidc.buildAuthorizationUrl(config, params);
  return NextResponse.redirect(url.href);
}
