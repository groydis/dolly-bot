import { VERIFY_SESSION_TTL_SECONDS } from "../../src/commands/verify/constants";
import type { VerifySession } from "../../src/lib/verify-session";

const SESSION_KEY_PREFIX = "session:";

function sessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

export type SeedVerifySessionInput = {
  sessionId: string;
  discordUserId: string;
  handle: string;
  orgSid: string;
  code: string;
  expiresAt?: number;
  createdAt?: number;
};

export async function seedVerifySession(
  kv: KVNamespace,
  input: SeedVerifySessionInput,
): Promise<VerifySession> {
  const now = Date.now();
  const session: VerifySession = {
    sessionId: input.sessionId,
    discordUserId: input.discordUserId,
    handle: input.handle,
    orgSid: input.orgSid,
    code: input.code,
    createdAt: input.createdAt ?? now,
    expiresAt:
      input.expiresAt ?? now + VERIFY_SESSION_TTL_SECONDS * 1000,
  };

  await kv.put(sessionKey(session.sessionId), JSON.stringify(session), {
    expirationTtl: VERIFY_SESSION_TTL_SECONDS,
  });

  return session;
}

export function sessionStorageKey(sessionId: string): string {
  return sessionKey(sessionId);
}
