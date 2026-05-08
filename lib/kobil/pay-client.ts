import "server-only";
import { randomUUID } from "node:crypto";

let tokenCache: { token: string; expiresAt: number } | null = null;

const TOKEN_TIMEOUT_MS = 8_000;
const REQUEST_TIMEOUT_MS = 12_000;
const TOKEN_RETRIES = 2;

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  token_type?: string;
};

/** Pay defaults to using the same OIDC client as Chat unless overridden. */
function payClientId(): string {
  const v = process.env.KOBIL_PAY_CLIENT_ID || process.env.KOBIL_CHAT_CLIENT_ID;
  if (!v) throw new Error("Missing KOBIL_PAY_CLIENT_ID (or fallback KOBIL_CHAT_CLIENT_ID)");
  return v;
}
function payClientSecret(): string {
  const v =
    process.env.KOBIL_PAY_CLIENT_SECRET || process.env.KOBIL_CHAT_CLIENT_SECRET;
  if (!v)
    throw new Error("Missing KOBIL_PAY_CLIENT_SECRET (or fallback KOBIL_CHAT_CLIENT_SECRET)");
  return v;
}
function payBase(): string {
  const v = process.env.KOBIL_PAY_BASE || process.env.KOBIL_MERCURY_BASE;
  if (!v) throw new Error("Missing KOBIL_PAY_BASE (or fallback KOBIL_MERCURY_BASE)");
  return v.replace(/\/$/, "");
}
function payTenantId(): string {
  const explicit = process.env.KOBIL_PAY_TENANT_ID;
  if (explicit) return explicit;
  const issuer = process.env.KOBIL_IDP_ISSUER;
  if (issuer) {
    const m = issuer.match(/\/realms\/([^/?#]+)/);
    if (m) return m[1];
  }
  throw new Error("Missing KOBIL_PAY_TENANT_ID (or KOBIL_IDP_ISSUER realm)");
}

async function fetchTokenOnce(): Promise<TokenResponse> {
  const issuer = process.env.KOBIL_IDP_ISSUER;
  if (!issuer) throw new Error("Missing KOBIL_IDP_ISSUER");

  const url = `${issuer.replace(/\/$/, "")}/protocol/openid-connect/token`;
  const basic = Buffer.from(`${payClientId()}:${payClientSecret()}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
    signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(
      `Pay token endpoint ${res.status} ${res.statusText} at ${url}: ${text.slice(0, 300)}`,
    );
  }
  try {
    return JSON.parse(text) as TokenResponse;
  } catch {
    throw new Error(`Pay token endpoint returned non-JSON: ${text.slice(0, 300)}`);
  }
}

async function getPayToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }
  console.log(
    `[pay] requesting client_credentials token clientId=${payClientId().slice(0, 8)}…`,
  );
  let lastErr: unknown;
  for (let attempt = 0; attempt <= TOKEN_RETRIES; attempt++) {
    try {
      const t0 = Date.now();
      const tokens = await fetchTokenOnce();
      console.log(`[pay] token obtained in ${Date.now() - t0}ms (attempt ${attempt + 1})`);
      if (!tokens.access_token) throw new Error("no access_token");
      tokenCache = {
        token: tokens.access_token,
        expiresAt: Date.now() + (tokens.expires_in ?? 300) * 1000,
      };
      return tokens.access_token;
    } catch (e) {
      lastErr = e;
      console.warn(
        `[pay] token attempt ${attempt + 1}/${TOKEN_RETRIES + 1} failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
  throw new Error(
    `Pay token request failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}

async function payFetch(path: string, init: RequestInit): Promise<unknown> {
  const token = await getPayToken();
  const url = `${payBase()}${path}`;
  console.log(`[pay] ${init.method ?? "POST"} ${url}`);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    throw new Error(`Pay fetch failed for ${url}: ${e instanceof Error ? e.message : String(e)}`);
  }
  const text = await res.text().catch(() => "");
  console.log(`[pay] response status=${res.status} body=${text.slice(0, 500)}`);
  if (!res.ok) {
    throw new Error(`Pay ${res.status} ${res.statusText} at ${url}: ${text.slice(0, 500)}`);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export type CreateTransactionInput = {
  /** KOBIL user UUID (OIDC sub) */
  userId: string;
  /** Amount in smallest currency unit (cents) */
  amountCents: number;
  currency: string;
  description: string;
  callbackUrl: string;
  /** Optional override for merchant id (default = pay client_id) */
  merchantId?: string;
};

export type CreateTransactionResult = {
  transactionId: string;
  raw: unknown;
};

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<CreateTransactionResult> {
  const merchantId = input.merchantId ?? payClientId();
  const body = {
    version: 1,
    idempotencyId: randomUUID(),
    userId: input.userId,
    merchantId,
    merchantServiceUUID: merchantId,
    merchantName: "Terbuch",
    merchantCallback: input.callbackUrl,
    transactionTimeout: 60,
    amount: input.amountCents,
    tenantId: payTenantId(),
    currency: input.currency,
    paymentContent: [[{ key: input.description, value: formatAmount(input.amountCents, input.currency) }]],
  };
  const resp = (await payFetch("/mpay-merchant/create/transaction", {
    method: "POST",
    body: JSON.stringify(body),
  })) as { transactionId?: string; [k: string]: unknown };

  if (!resp || typeof resp.transactionId !== "string") {
    throw new Error(`Pay createTransaction: missing transactionId in response: ${JSON.stringify(resp).slice(0, 200)}`);
  }
  return { transactionId: resp.transactionId, raw: resp };
}

export type StatusResult = {
  raw: unknown;
  /** Best-effort normalized status — see normalize() below */
  normalized:
    | "PENDING"
    | "INITIATED"
    | "SUCCESS"
    | "FAILED"
    | "CANCELLED"
    | "UNKNOWN";
  rawStatus: string | undefined;
};

export async function getTransactionStatus(
  transactionId: string,
  callbackUrl: string,
): Promise<StatusResult> {
  const body = {
    merchantId: payClientId(),
    merchantCallback: callbackUrl,
    transactionId,
  };
  const raw = (await payFetch("/mpay-merchant/create/transaction/status", {
    method: "POST",
    body: JSON.stringify(body),
  })) as { status?: string; transactionStatus?: string; [k: string]: unknown };

  const rawStatus = (raw.status ?? raw.transactionStatus) as string | undefined;
  return { raw, normalized: normalize(rawStatus), rawStatus };
}

function normalize(s: string | undefined): StatusResult["normalized"] {
  if (!s) return "UNKNOWN";
  const u = s.toUpperCase();
  if (u.includes("SUCCESS") || u.includes("COMPLETED") || u.includes("PAID")) return "SUCCESS";
  if (u.includes("FAIL") || u.includes("ERROR") || u.includes("REJECT")) return "FAILED";
  if (u.includes("CANCEL") || u.includes("VOID")) return "CANCELLED";
  if (u.includes("INIT")) return "INITIATED";
  if (u.includes("PEND") || u.includes("PROCESS") || u.includes("WAIT")) return "PENDING";
  return "UNKNOWN";
}

function formatAmount(cents: number, currency: string): string {
  const major = (cents / 100).toFixed(2);
  return `${major} ${currency}`;
}
