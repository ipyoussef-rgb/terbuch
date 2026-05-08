import "server-only";

let tokenCache: { token: string; expiresAt: number } | null = null;

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(
      parts[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const TOKEN_TIMEOUT_MS = 8_000;
const TOKEN_RETRIES = 2;

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

async function fetchTokenOnce(): Promise<TokenResponse> {
  const issuer = process.env.KOBIL_IDP_ISSUER;
  const clientId = process.env.KOBIL_CHAT_CLIENT_ID;
  const clientSecret = process.env.KOBIL_CHAT_CLIENT_SECRET;
  if (!issuer || !clientId || !clientSecret) {
    throw new Error(
      "Missing KOBIL_IDP_ISSUER / KOBIL_CHAT_CLIENT_ID / KOBIL_CHAT_CLIENT_SECRET",
    );
  }
  const url = `${issuer.replace(/\/$/, "")}/protocol/openid-connect/token`;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
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
      `Token endpoint ${res.status} ${res.statusText} at ${url}: ${text.slice(0, 300)}`,
    );
  }
  try {
    return JSON.parse(text) as TokenResponse;
  } catch {
    throw new Error(`Token endpoint returned non-JSON: ${text.slice(0, 300)}`);
  }
}

async function getChatToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    console.log("[mercury] reusing cached token");
    return tokenCache.token;
  }
  console.log(
    `[mercury] requesting client_credentials token clientId=${process.env.KOBIL_CHAT_CLIENT_ID?.slice(0, 8)}… (timeout=${TOKEN_TIMEOUT_MS}ms, retries=${TOKEN_RETRIES})`,
  );

  let tokens: TokenResponse | undefined;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= TOKEN_RETRIES; attempt++) {
    try {
      const t0 = Date.now();
      tokens = await fetchTokenOnce();
      console.log(`[mercury] token obtained in ${Date.now() - t0}ms (attempt ${attempt + 1})`);
      break;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(
        `[mercury] token attempt ${attempt + 1}/${TOKEN_RETRIES + 1} failed: ${msg}`,
      );
    }
  }

  if (!tokens) {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    throw new Error(
      `KOBIL Chat token request failed after ${TOKEN_RETRIES + 1} attempts (check Service Accounts on chat client + IDP reachability): ${msg}`,
    );
  }
  if (!tokens.access_token) {
    throw new Error("KOBIL Chat: client_credentials returned no access_token");
  }

  const payload = decodeJwtPayload(tokens.access_token);
  console.log(
    `[mercury] got token expires_in=${tokens.expires_in} scope=${tokens.scope ?? "(none)"} ` +
      `iss=${payload?.iss} aud=${JSON.stringify(payload?.aud)} ` +
      `azp=${payload?.azp} sub=${payload?.sub} ` +
      `tokenPrefix=${tokens.access_token.slice(0, 16)}…`,
  );
  tokenCache = {
    token: tokens.access_token,
    expiresAt: Date.now() + (tokens.expires_in ?? 300) * 1000,
  };
  return tokens.access_token;
}

function base(): string {
  const v = process.env.KOBIL_MERCURY_BASE;
  if (!v) throw new Error("KOBIL_MERCURY_BASE is not set");
  return v.replace(/\/$/, "");
}

function realm(): string {
  const explicit = process.env.KOBIL_REALM;
  if (explicit) return explicit;
  const issuer = process.env.KOBIL_IDP_ISSUER;
  if (issuer) {
    const m = issuer.match(/\/realms\/([^/?#]+)/);
    if (m) return m[1];
  }
  throw new Error("KOBIL realm not configured (set KOBIL_REALM or KOBIL_IDP_ISSUER)");
}

function serviceUuid(): string {
  const v =
    process.env.KOBIL_CHAT_SERVICE_UUID || process.env.KOBIL_CHAT_CLIENT_ID;
  if (!v) {
    throw new Error(
      "KOBIL_CHAT_SERVICE_UUID (or KOBIL_CHAT_CLIENT_ID as fallback) is not set",
    );
  }
  return v;
}

function sendPathTemplate(): string {
  return (
    process.env.KOBIL_CHAT_SEND_PATH ??
    "/auth/realms/{realm}/mpower/v1/users/{userId}/message"
  );
}

type OutboundContent = {
  messageType: string;
  messageContent: Record<string, unknown>;
};

async function mercuryFetchOnce(
  url: string,
  bodyJson: string,
  messageType: string,
  forceFreshToken: boolean,
): Promise<{ res: Response; text: string }> {
  if (forceFreshToken) tokenCache = null;
  const token = await getChatToken();
  console.log(
    `[mercury] POST ${url} (type=${messageType}, freshToken=${forceFreshToken})`,
  );
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: bodyJson,
  });
  const text = await res.text().catch(() => "");
  const reqId =
    res.headers.get("x-request-id") ??
    res.headers.get("x-correlation-id") ??
    res.headers.get("traceparent") ??
    "—";
  console.log(
    `[mercury] response status=${res.status} ${res.statusText} reqId=${reqId} body=${text.slice(0, 500)}`,
  );
  return { res, text };
}

async function send(userId: string, content: OutboundContent): Promise<unknown> {
  const svc = serviceUuid();
  const path = sendPathTemplate()
    .replace("{realm}", encodeURIComponent(realm()))
    .replace("{serviceUuid}", encodeURIComponent(svc))
    .replace("{userId}", encodeURIComponent(userId));
  const url = `${base()}${path}`;
  const body = { serviceUuid: svc, version: 3, ...content };
  const bodyJson = JSON.stringify(body);

  let attempt;
  try {
    attempt = await mercuryFetchOnce(url, bodyJson, content.messageType, false);
  } catch (e) {
    throw new Error(
      `Mercury fetch failed for ${url}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (attempt.res.status === 401) {
    console.warn("[mercury] 401 — invalidating token cache and retrying once");
    try {
      attempt = await mercuryFetchOnce(url, bodyJson, content.messageType, true);
    } catch (e) {
      throw new Error(
        `Mercury retry-fetch failed for ${url}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  if (!attempt.res.ok) {
    throw new Error(
      `Mercury ${attempt.res.status} ${attempt.res.statusText} at ${url}: ${attempt.text.slice(0, 500)}`,
    );
  }

  try {
    return attempt.text ? JSON.parse(attempt.text) : {};
  } catch {
    return { raw: attempt.text };
  }
}

export async function sendPlainText(
  userId: string,
  text: string,
): Promise<unknown> {
  return send(userId, {
    messageType: "processChatMessage",
    messageContent: { messageText: text },
  });
}

export async function sendProcessChatMessage(
  userId: string,
  text: string,
): Promise<unknown> {
  return sendPlainText(userId, text);
}

export async function sendChoiceRequest(
  userId: string,
  text: string,
  choices: string[],
): Promise<unknown> {
  return send(userId, {
    messageType: "choiceRequest",
    messageContent: {
      messageText: text,
      choices: choices.map((t) => ({ text: t })),
    },
  });
}

export const ChatChoice = {
  CONFIRM: "Ja, bestätigen",
  CANCEL: "Nein, abbrechen",
} as const;
