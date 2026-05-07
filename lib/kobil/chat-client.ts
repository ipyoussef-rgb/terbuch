import "server-only";
import * as oidc from "openid-client";
import { oidcConfig } from "@/lib/auth/oidc";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getChatToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }
  console.log("[mercury] requesting client_credentials token");
  const config = await oidcConfig("chat");
  let tokens;
  try {
    tokens = await oidc.clientCredentialsGrant(config, { scope: "openid" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`KOBIL Chat token request failed (check Service Accounts on chat client): ${msg}`);
  }
  if (!tokens.access_token) {
    throw new Error("KOBIL Chat: client_credentials returned no access_token");
  }
  tokenCache = {
    token: tokens.access_token,
    expiresAt: Date.now() + (tokens.expires_in ?? 300) * 1000,
  };
  console.log("[mercury] got token");
  return tokens.access_token;
}

function base(): string {
  const v = process.env.KOBIL_MERCURY_BASE;
  if (!v) throw new Error("KOBIL_MERCURY_BASE is not set");
  return v.replace(/\/$/, "");
}

function realm(): string {
  // Try explicit env first, otherwise extract from issuer URL.
  const explicit = process.env.KOBIL_REALM;
  if (explicit) return explicit;
  const issuer = process.env.KOBIL_IDP_ISSUER;
  if (issuer) {
    const m = issuer.match(/\/realms\/([^/?#]+)/);
    if (m) return m[1];
  }
  throw new Error("KOBIL realm not configured (set KOBIL_REALM or KOBIL_IDP_ISSUER)");
}

function serviceUuid(): string | undefined {
  const v = process.env.KOBIL_CHAT_SERVICE_UUID;
  return v && v.length > 0 ? v : undefined;
}

function sendPathTemplate(): string {
  return (
    process.env.KOBIL_CHAT_SEND_PATH ??
    "/auth/realms/{realm}/mpower/v1/users/{userId}/message"
  );
}

type MessageBody = {
  messageType: string;
  messageContent: Record<string, unknown>;
};

async function send(userId: string, body: MessageBody): Promise<unknown> {
  const token = await getChatToken();
  const svc = serviceUuid();
  const path = sendPathTemplate()
    .replace("{realm}", encodeURIComponent(realm()))
    .replace("{serviceUuid}", encodeURIComponent(svc ?? ""))
    .replace("{userId}", encodeURIComponent(userId));
  const url = `${base()}${path}`;
  console.log(`[mercury] POST ${url} (type=${body.messageType})`);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Mercury fetch failed for ${url}: ${msg}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mercury ${res.status} ${res.statusText} at ${url}: ${text.slice(0, 500)}`);
  }
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function sendPlainText(
  userId: string,
  text: string,
): Promise<unknown> {
  return send(userId, {
    messageType: "plainText",
    messageContent: { messageText: text },
  });
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

export async function sendProcessChatMessage(
  userId: string,
  text: string,
): Promise<unknown> {
  return send(userId, {
    messageType: "processChatMessage",
    messageContent: { messageText: text },
  });
}

export const ChatChoice = {
  CONFIRM: "Ja, bestätigen",
  CANCEL: "Nein, abbrechen",
} as const;
