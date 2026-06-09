import { PING_COOLDOWN_SECONDS } from "../config/cooldown";
import type { AppError } from "../errors";
import { err, ok, type Result } from "../lib/result";

function pingCooldownKey(userId: string): string {
  return `ping:${userId}`;
}

export async function checkPingCooldown(
  kv: KVNamespace,
  userId: string,
): Promise<Result<void, AppError>> {
  const active = await kv.get(pingCooldownKey(userId));
  if (active) {
    return err({ code: "COOLDOWN_ACTIVE", seconds: PING_COOLDOWN_SECONDS });
  }

  return ok(undefined);
}

export async function setPingCooldown(
  kv: KVNamespace,
  userId: string,
): Promise<void> {
  await kv.put(pingCooldownKey(userId), Date.now().toString(), {
    expirationTtl: PING_COOLDOWN_SECONDS,
  });
}
