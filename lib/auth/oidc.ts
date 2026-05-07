import * as oidc from "openid-client";

export type Role = "user" | "admin" | "chat";

type RoleConfig = {
  clientId: string;
  clientSecret: string;
  scope: string;
};

const ROLE_CONFIG: Record<Role, RoleConfig> = {
  user: {
    clientId: process.env.KOBIL_USER_CLIENT_ID ?? "",
    clientSecret: process.env.KOBIL_USER_CLIENT_SECRET ?? "",
    scope: "openid profile email phone address",
  },
  admin: {
    clientId: process.env.KOBIL_ADMIN_CLIENT_ID ?? "",
    clientSecret: process.env.KOBIL_ADMIN_CLIENT_SECRET ?? "",
    scope: "openid profile email",
  },
  chat: {
    clientId: process.env.KOBIL_CHAT_CLIENT_ID ?? "",
    clientSecret: process.env.KOBIL_CHAT_CLIENT_SECRET ?? "",
    scope: "openid",
  },
};

const cache = new Map<Role, Promise<oidc.Configuration>>();

export function oidcConfig(role: Role): Promise<oidc.Configuration> {
  let cached = cache.get(role);
  if (cached) return cached;

  const issuer = process.env.KOBIL_IDP_ISSUER;
  if (!issuer) throw new Error("KOBIL_IDP_ISSUER is not set");

  const cfg = ROLE_CONFIG[role];
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error(`OIDC client credentials missing for role=${role}`);
  }

  cached = oidc.discovery(new URL(issuer), cfg.clientId, cfg.clientSecret);
  cache.set(role, cached);
  return cached;
}

export function oidcScope(role: Role): string {
  return ROLE_CONFIG[role].scope;
}

export function appBaseUrl(): string {
  const env = process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL;
  if (env) return env.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function redirectUri(role: "user" | "admin"): string {
  return `${appBaseUrl()}/api/auth/${role}/callback`;
}
