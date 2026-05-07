import "server-only";
import * as oidc from "openid-client";
import { oidcConfig } from "@/lib/auth/oidc";

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

async function getChatToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    console.log("[mercury] reusing cached token");
    return tokenCache.token;
  }
  console.log(
    `[mercury] requesting client_credentials token clientId=${process.env.KOBIL_CHAT_CLIENT_ID?.slice(0, 8)}…`,
  );
  const config = await oidcConfig("chat");
  let tokens;
  try {
    tokens = await oidc.clientCredentialsGrant(config, {});
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `KOBIL Chat token request failed (check Service Accounts on chat client): ${msg}`,
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

async function send(userId: string, content: OutboundContent): Promise<unknown> {
  const token = await getChatToken();
  const svc = serviceUuid();
  const path = sendPathTemplate()
    .replace("{realm}", encodeURIComponent(realm()))
    .replace("{serviceUuid}", encodeURIComponent(svc))
    .replace("{userId}", encodeURIComponent(userId));
  const url = `${base()}${path}`;

  const body = {
    serviceUuid: svc,
    version: 3,
    ...content,
  };
  const bodyJson = JSON.stringify(body);

  console.log(
    `[mercury] POST ${url}\n` +
      `        body=${bodyJson}`,
  );

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: bodyJson,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Mercury fetch failed for ${url}: ${msg}`);
  }

  const respText = await res.text().catch(() => "");
  const reqId =
    res.headers.get("x-request-id") ??
    res.headers.get("x-correlation-id") ??
    res.headers.get("traceparent") ??
    "—";
  console.log(
    `[mercury] response status=${res.status} ${res.statusText} reqId=${reqId} body=${respText.slice(0, 500)}`,
  );

  if (!res.ok) {
    throw new Error(
      `Mercury ${res.status} ${res.statusText} at ${url}: ${respText.slice(0, 500)}`,
    );
  }

  try {
    return respText ? JSON.parse(respText) : {};
  } catch {
    return { raw: respText };
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
