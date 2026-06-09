import { VERIFY_CODE_LENGTH, VERIFY_SESSION_TTL_SECONDS } from "../commands/verify/constants";
import { SCANZ_SID } from "./org-symbol";

export interface VerifySession {
  sessionId: string;
  discordUserId: string;
  handle: string;
  orgSid: string;
  code: string;
  createdAt: number;
  expiresAt: number;
}

const SESSION_KEY_PREFIX = "session:";
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function sessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

function generateVerifyCode(): string {
  const bytes = new Uint8Array(VERIFY_CODE_LENGTH);
  crypto.getRandomValues(bytes);

  let code = "";
  for (const byte of bytes) {
    code += CODE_CHARS[byte % CODE_CHARS.length];
  }

  return code;
}

export async function createVerifySession(
  kv: KVNamespace,
  discordUserId: string,
  handle: string,
  orgSid: string,
): Promise<VerifySession> {
  const now = Date.now();
  const session: VerifySession = {
    sessionId: crypto.randomUUID(),
    discordUserId,
    handle,
    orgSid,
    code: generateVerifyCode(),
    createdAt: now,
    expiresAt: now + VERIFY_SESSION_TTL_SECONDS * 1000,
  };

  await kv.put(sessionKey(session.sessionId), JSON.stringify(session), {
    expirationTtl: VERIFY_SESSION_TTL_SECONDS,
  });

  return session;
}

export async function getVerifySession(
  kv: KVNamespace,
  sessionId: string,
): Promise<VerifySession | null> {
  const raw = await kv.get(sessionKey(sessionId));
  if (!raw) {
    return null;
  }

  const session = JSON.parse(raw) as VerifySession;
  if (!session.orgSid) {
    session.orgSid = SCANZ_SID;
  }
  if (Date.now() > session.expiresAt) {
    await kv.delete(sessionKey(sessionId));
    return null;
  }

  return session;
}

export async function deleteVerifySession(
  kv: KVNamespace,
  sessionId: string,
): Promise<void> {
  await kv.delete(sessionKey(sessionId));
}

export function parseVerifyConfirmCustomId(
  customId: string,
): string | null {
  const prefix = "verify:confirm:";
  if (!customId.startsWith(prefix)) {
    return null;
  }

  const sessionId = customId.slice(prefix.length);
  return sessionId.length > 0 ? sessionId : null;
}
