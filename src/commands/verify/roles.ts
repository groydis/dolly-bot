import type { DiscordApi } from "../../discord/api";
import type { Env } from "../../env";
import { DISCORD_NICKNAME_MAX_LENGTH } from "../../discord/constants";
import { postRoleReviewAlert } from "./role-review-alert";
import {
  computePartnerRoleSyncPlan,
  computeScanzRoleSyncPlan,
  type RoleReviewItem,
} from "./role-sync";
import type { VerifyRoleKey } from "../../rsi/types";
import { verifyLog } from "./log";

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

export function formatRoleKeyMentions(
  env: Env,
  roleKeys: readonly VerifyRoleKey[],
): string {
  return roleKeys.map((key) => `<@&${getRoleIdForKey(env, key)}>`).join(", ");
}

export function getAllVerifyManagedRoleIds(env: Env): string[] {
  return [
    env.SCANZ_ROLE_ID,
    env.VERIFIED_ROLE_ID,
    env.AFFILIATE_ROLE_ID,
  ];
}

export interface ApplyVerificationRolesResult {
  roleReviewNeeded: boolean;
  rolesNeedingReview: RoleReviewItem[];
  scanzMembershipReviewNeeded: boolean;
}

export interface ApplyPartnerVerificationRolesResult {
  roleReviewNeeded: boolean;
  rolesNeedingReview: RoleReviewItem[];
}

async function applyRoleAdds(
  api: DiscordApi,
  guildId: string,
  userId: string,
  roleIds: readonly string[],
): Promise<void> {
  for (const roleId of roleIds) {
    await api.addMemberRole(guildId, userId, roleId);
  }
}

/**
 * Add-only SCANZ verify: grants missing roles, never auto-removes. Roles RSI no longer
 * grants (including @SCANZ/@Verified on affiliate-only) are flagged for staff review
 * via postRoleReviewAlert → AUDIT_CHANNEL_ID.
 */
export async function applyVerificationRoles(
  api: DiscordApi,
  env: Env,
  guildId: string,
  userId: string,
  targetRoles: readonly VerifyRoleKey[],
  currentRoleIds: readonly string[],
  alertContext: {
    handle: string;
    orgSid: string;
    rsiReason: string;
  },
): Promise<ApplyVerificationRolesResult> {
  const plan = computeScanzRoleSyncPlan(env, targetRoles, currentRoleIds);

  verifyLog("apply_scanz_roles", {
    userId,
    targetRoles: [...targetRoles],
    currentRoleIds: [...currentRoleIds],
    scanzMembershipReviewNeeded: plan.scanzMembershipReviewNeeded,
    rolesToAdd: plan.rolesToAdd,
    rolesNeedingReview: plan.rolesNeedingReview,
    scanzRoleId: env.SCANZ_ROLE_ID,
    verifiedRoleId: env.VERIFIED_ROLE_ID,
    affiliateRoleId: env.AFFILIATE_ROLE_ID,
  });

  await applyRoleAdds(api, guildId, userId, plan.rolesToAdd);

  if (plan.rolesNeedingReview.length > 0) {
    await postRoleReviewAlert(env, api, {
      verifyPath: "scanz",
      discordUserId: userId,
      handle: alertContext.handle,
      orgSid: alertContext.orgSid,
      rsiReason: alertContext.rsiReason,
      targetRoleKeys: targetRoles,
      rolesNeedingReview: plan.rolesNeedingReview,
      currentRoleIds,
    });
  }

  return {
    roleReviewNeeded: plan.rolesNeedingReview.length > 0,
    rolesNeedingReview: plan.rolesNeedingReview,
    scanzMembershipReviewNeeded: plan.scanzMembershipReviewNeeded,
  };
}

/**
 * Partner verify: affiliate-only (org roster miss) targets at most @Affiliate — no
 * @Verified or org role is added. Stale @org_* roles are flagged for review; @SCANZ
 * is never stripped (see computePartnerRoleSyncPlan in role-sync.ts).
 */
export async function applyPartnerVerificationRoles(
  api: DiscordApi,
  env: Env,
  guildId: string,
  userId: string,
  orgRoleId: string | null,
  affiliateOnly: boolean,
  currentRoleIds: readonly string[],
  alertContext: {
    handle: string;
    orgSid: string;
    rsiReason: string;
    targetRoleKeys: readonly VerifyRoleKey[];
    orgRoleId?: string | null;
  },
): Promise<ApplyPartnerVerificationRolesResult> {
  const guildRoles = await api.listGuildRoles(guildId);

  const plan = computePartnerRoleSyncPlan({
    env,
    guildRoles,
    currentRoleIds,
    orgRoleId,
    affiliateOnly,
    orgSid: alertContext.orgSid,
  });

  verifyLog("apply_partner_roles", {
    userId,
    affiliateOnly,
    orgRoleId,
    rolesToAdd: plan.rolesToAdd,
    rolesNeedingReview: plan.rolesNeedingReview,
    currentRoleIds: [...currentRoleIds],
    affiliateRoleId: env.AFFILIATE_ROLE_ID,
    verifiedRoleId: env.VERIFIED_ROLE_ID,
  });

  await applyRoleAdds(api, guildId, userId, plan.rolesToAdd);

  if (plan.rolesNeedingReview.length > 0) {
    await postRoleReviewAlert(env, api, {
      verifyPath: "partner",
      discordUserId: userId,
      handle: alertContext.handle,
      orgSid: alertContext.orgSid,
      rsiReason: alertContext.rsiReason,
      targetRoleKeys: alertContext.targetRoleKeys,
      rolesNeedingReview: plan.rolesNeedingReview,
      currentRoleIds,
      orgRoleId: alertContext.orgRoleId,
    });
  }

  return {
    roleReviewNeeded: plan.rolesNeedingReview.length > 0,
    rolesNeedingReview: plan.rolesNeedingReview,
  };
}

export function truncateNickname(value: string): string {
  return value.length > DISCORD_NICKNAME_MAX_LENGTH
    ? value.slice(0, DISCORD_NICKNAME_MAX_LENGTH)
    : value;
}

export function buildPartnerNickname(orgSid: string, handle: string): string {
  return truncateNickname(`[${orgSid}] ${handle}`);
}
