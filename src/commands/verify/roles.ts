import type { DiscordApiClient } from "../../discord/api";
import type { Env } from "../../env";
import type { VerifyRoleKey } from "./rsi/types";

export function getRoleIdForKey(env: Env, key: VerifyRoleKey): string {
  switch (key) {
    case "scanz":
      return env.SCANZ_ROLE_ID;
    case "verified":
      return env.VERIFIED_ROLE_ID;
    case "affiliate":
      return env.AFFILIATE_ROLE_ID;
  }
}

export function getAllVerifyManagedRoleIds(env: Env): string[] {
  return [
    env.SCANZ_ROLE_ID,
    env.VERIFIED_ROLE_ID,
    env.AFFILIATE_ROLE_ID,
  ];
}

export async function applyVerificationRoles(
  api: DiscordApiClient,
  env: Env,
  guildId: string,
  userId: string,
  targetRoles: readonly VerifyRoleKey[],
  currentRoleIds: readonly string[],
): Promise<void> {
  const targetRoleIds = new Set(targetRoles.map((key) => getRoleIdForKey(env, key)));
  const managedRoleIds = getAllVerifyManagedRoleIds(env);

  for (const roleId of managedRoleIds) {
    const shouldHave = targetRoleIds.has(roleId);
    const has = currentRoleIds.includes(roleId);

    if (shouldHave && !has) {
      await api.addMemberRole(guildId, userId, roleId);
    } else if (!shouldHave && has) {
      await api.removeMemberRole(guildId, userId, roleId);
    }
  }
}

export function truncateNickname(handle: string): string {
  return handle.length > 32 ? handle.slice(0, 32) : handle;
}
