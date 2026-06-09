import type { DiscordApiClient } from "../../discord/api";
import type { Env } from "../../env";
import { isOrgRoleDiscordName } from "../../lib/org-symbol";
import { verifyLog } from "./log";
import type { VerifyRoleKey } from "../../rsi/types";

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

export interface ApplyVerificationRolesResult {
  scanzRoleReviewNeeded: boolean;
}

export async function applyVerificationRoles(
  api: DiscordApiClient,
  env: Env,
  guildId: string,
  userId: string,
  targetRoles: readonly VerifyRoleKey[],
  currentRoleIds: readonly string[],
): Promise<ApplyVerificationRolesResult> {
  const targetRoleIds = new Set(targetRoles.map((key) => getRoleIdForKey(env, key)));
  const managedRoleIds = getAllVerifyManagedRoleIds(env);
  const hasScanz = currentRoleIds.includes(env.SCANZ_ROLE_ID);
  const shouldHaveScanz = targetRoleIds.has(env.SCANZ_ROLE_ID);
  const scanzRoleReviewNeeded = hasScanz && !shouldHaveScanz;

  verifyLog("apply_scanz_roles", {
    userId,
    targetRoles: [...targetRoles],
    currentRoleIds: [...currentRoleIds],
    scanzRoleReviewNeeded,
    scanzRoleId: env.SCANZ_ROLE_ID,
    verifiedRoleId: env.VERIFIED_ROLE_ID,
    affiliateRoleId: env.AFFILIATE_ROLE_ID,
  });

  for (const roleId of managedRoleIds) {
    const shouldHave = targetRoleIds.has(roleId);
    const has = currentRoleIds.includes(roleId);

    if (scanzRoleReviewNeeded) {
      if (roleId === env.SCANZ_ROLE_ID || roleId === env.VERIFIED_ROLE_ID) {
        if (shouldHave && !has) {
          await api.addMemberRole(guildId, userId, roleId);
        }
        continue;
      }
    }

    if (shouldHave && !has) {
      await api.addMemberRole(guildId, userId, roleId);
    } else if (!shouldHave && has) {
      await api.removeMemberRole(guildId, userId, roleId);
    }
  }

  return { scanzRoleReviewNeeded };
}

export async function applyPartnerVerificationRoles(
  api: DiscordApiClient,
  env: Env,
  guildId: string,
  userId: string,
  orgRoleId: string | null,
  affiliateOnly: boolean,
  currentRoleIds: readonly string[],
): Promise<void> {
  const guildRoles = await api.listGuildRoles(guildId);
  const orgRoleIds = guildRoles
    .filter((role) => isOrgRoleDiscordName(role.name))
    .map((role) => role.id);

  for (const roleId of orgRoleIds) {
    if (!currentRoleIds.includes(roleId)) {
      continue;
    }

    if (affiliateOnly || roleId !== orgRoleId) {
      await api.removeMemberRole(guildId, userId, roleId);
    }
  }

  const targetIds = affiliateOnly
    ? resolvePartnerAffiliateOnlyRoleIds(env, currentRoleIds)
    : [env.AFFILIATE_ROLE_ID, env.VERIFIED_ROLE_ID, orgRoleId!];

  const orgRoleNames = guildRoles
    .filter((role) => orgRoleIds.includes(role.id))
    .map((role) => ({ id: role.id, name: role.name }));

  verifyLog("apply_partner_roles", {
    userId,
    affiliateOnly,
    orgRoleId,
    rolesToAdd: targetIds,
    orgRolesOnMember: orgRoleNames.filter((role) =>
      currentRoleIds.includes(role.id),
    ),
    currentRoleIds: [...currentRoleIds],
    affiliateRoleId: env.AFFILIATE_ROLE_ID,
    verifiedRoleId: env.VERIFIED_ROLE_ID,
  });

  for (const roleId of targetIds) {
    if (!currentRoleIds.includes(roleId)) {
      await api.addMemberRole(guildId, userId, roleId);
    }
  }
}

export function truncateNickname(value: string): string {
  return value.length > 32 ? value.slice(0, 32) : value;
}

export function buildPartnerNickname(orgSid: string, handle: string): string {
  return truncateNickname(`[${orgSid}] ${handle}`);
}

function resolvePartnerAffiliateOnlyRoleIds(
  env: Env,
  currentRoleIds: readonly string[],
): string[] {
  if (currentRoleIds.includes(env.AFFILIATE_ROLE_ID)) {
    return [];
  }

  if (
    currentRoleIds.includes(env.VERIFIED_ROLE_ID) ||
    currentRoleIds.includes(env.SCANZ_ROLE_ID)
  ) {
    return [];
  }

  return [env.AFFILIATE_ROLE_ID];
}
