import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type UserClaims = {
  sub: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  street?: string;
  postalCode?: string;
  city?: string;
};

export type AdminClaims = {
  sub: string;
  email?: string;
  name?: string;
};

export type SessionData =
  | { role: "user"; user: UserClaims; expiresAt: number }
  | { role: "admin"; admin: AdminClaims; expiresAt: number };

const SESSION_TTL_SEC = 60 * 60 * 8;

const COOKIE_NAMES: Record<"user" | "admin", string> = {
  user: "terbuch_user_session",
  admin: "terbuch_admin_session",
};

const FLOW_COOKIES: Record<"user" | "admin", string> = {
  user: "terbuch_user_flow",
  admin: "terbuch_admin_flow",
};

function key(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

async function signJwt(payload: Record<string, unknown>, ttlSec: number): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(key());
}

async function verifyJwt<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload as unknown as T;
  } catch {
    return null;
  }
}

export async function setSession(
  role: "user" | "admin",
  data: SessionData,
): Promise<void> {
  const token = await signJwt({ data }, SESSION_TTL_SEC);
  const jar = await cookies();
  jar.set(COOKIE_NAMES[role], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function clearSession(role: "user" | "admin"): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAMES[role]);
}

export async function getSession(
  role: "user" | "admin",
): Promise<SessionData | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAMES[role])?.value;
  if (!token) return null;
  const payload = await verifyJwt<{ data: SessionData }>(token);
  return payload?.data ?? null;
}

export async function requireUser(): Promise<UserClaims> {
  const s = await getSession("user");
  if (!s || s.role !== "user") {
    throw new Response("Unauthorized", { status: 401 });
  }
  return s.user;
}

export async function requireAdmin(): Promise<AdminClaims> {
  const s = await getSession("admin");
  if (!s || s.role !== "admin") {
    throw new Response("Unauthorized", { status: 401 });
  }
  return s.admin;
}

export type FlowState = {
  pkceVerifier: string;
  state?: string;
  returnTo?: string;
};

export async function setFlowCookie(
  role: "user" | "admin",
  flow: FlowState,
): Promise<void> {
  const token = await signJwt(
    { ...flow, role, kind: "oidc-flow" },
    5 * 60,
  );
  const jar = await cookies();
  jar.set(FLOW_COOKIES[role], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });
}

export async function readFlowCookie(
  role: "user" | "admin",
): Promise<FlowState | null> {
  const jar = await cookies();
  const token = jar.get(FLOW_COOKIES[role])?.value;
  if (!token) return null;
  const payload = await verifyJwt<FlowState & { role: string; kind: string }>(token);
  if (!payload || payload.kind !== "oidc-flow" || payload.role !== role) return null;
  return {
    pkceVerifier: payload.pkceVerifier,
    state: payload.state,
    returnTo: payload.returnTo,
  };
}

export async function clearFlowCookie(role: "user" | "admin"): Promise<void> {
  const jar = await cookies();
  jar.delete(FLOW_COOKIES[role]);
}
