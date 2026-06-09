import type { Env } from "../../env";
import { isOrgRoleDiscordName } from "../../lib/org-symbol";
import type { VerifyRoleKey } from "../../rsi/types";

export type RoleReviewItem = {
  roleId: string;
  roleName?: string;
  reason: string;
};

export type RoleSyncPlan = {
  rolesToAdd: string[];
  rolesNeedingReview: RoleReviewItem[];
};

function managedRoleIds(env: Env): string[] {
  return [env.SCANZ_ROLE_ID, env.VERIFIED_ROLE_ID, env.AFFILIATE_ROLE_ID];
}

function roleIdForKey(env: Env, key: VerifyRoleKey): string {
  switch (key) {
    case "scanz":
      return env.SCANZ_ROLE_ID;
    case "verified":
      return env.VERIFIED_ROLE_ID;
    case "affiliate":
      return env.AFFILIATE_ROLE_ID;
  }
}

function globalRoleIds(env: Env): Set<string> {
  return new Set(managedRoleIds(env));
}

function roleLabel(env: Env, roleId: string): string {
  if (roleId === env.SCANZ_ROLE_ID) {
    return "@SCANZ";
  }
  if (roleId === env.VERIFIED_ROLE_ID) {
    return "@Verified";
  }
  if (roleId === env.AFFILIATE_ROLE_ID) {
    return "@Affiliate";
  }
  return roleId;
}

function appendReviewItem(
  items: RoleReviewItem[],
  item: RoleReviewItem,
): void {
  if (items.some((existing) => existing.roleId === item.roleId)) {
    return;
  }

  items.push(item);
}

/** Symmetric diff on role ID sets. Verify maps remove → rolesNeedingReview instead of applying removes. */
export function diffRoleIds(
  current: ReadonlySet<string>,
  desired: ReadonlySet<string>,
): { add: string[]; remove: string[] } {
  const add: string[] = [];
  const remove: string[] = [];

  for (const roleId of desired) {
    if (!current.has(roleId)) {
      add.push(roleId);
    }
  }

  for (const roleId of current) {
    if (!desired.has(roleId)) {
      remove.push(roleId);
    }
  }

  return { add, remove };
}

/**
 * Scanz verification adjusts global membership roles only; partner org roles are out of scope.
 */
export function computeScanzRoleSyncPlan(
  env: Env,
  targetRoles: readonly VerifyRoleKey[],
  currentRoleIds: readonly string[],
): RoleSyncPlan & { scanzMembershipReviewNeeded: boolean } {
  const targetRoleIds = new Set(targetRoles.map((key) => roleIdForKey(env, key)));
  const current = new Set(currentRoleIds);
  const rolesToAdd: string[] = [];
  const rolesNeedingReview: RoleReviewItem[] = [];

  const hasScanz = current.has(env.SCANZ_ROLE_ID);
  const shouldHaveScanz = targetRoleIds.has(env.SCANZ_ROLE_ID);
  const scanzMembershipReviewNeeded = hasScanz && !shouldHaveScanz;

  for (const roleId of managedRoleIds(env)) {
    const shouldHave = targetRoleIds.has(roleId);
    const has = current.has(roleId);

    if (shouldHave && !has) {
      rolesToAdd.push(roleId);
      continue;
    }

    if (!shouldHave && has) {
      const label = roleLabel(env, roleId);

      if (
        scanzMembershipReviewNeeded &&
        (roleId === env.SCANZ_ROLE_ID || roleId === env.VERIFIED_ROLE_ID)
      ) {
        // Member had @SCANZ but RSI now classifies affiliate-only. We add earned roles
        // but do not auto-remove @SCANZ/@Verified — staff must review before roles are stripped.
        appendReviewItem(rolesNeedingReview, {
          roleId,
          reason: `Has ${label} but RSI verification does not support SCANZ membership`,
        });
      } else {
        appendReviewItem(rolesNeedingReview, {
          roleId,
          reason: `Has ${label} but RSI classification does not grant this role`,
        });
      }
    }
  }

  return {
    rolesToAdd,
    rolesNeedingReview,
    scanzMembershipReviewNeeded,
  };
}

export function resolvePartnerAffiliateOnlyRoleIds(
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

/**
 * Partner verification manages org_* roles and adds global roles; it never strips @SCANZ.
 */
export function computePartnerRoleSyncPlan(input: {
  env: Env;
  guildRoles: readonly { id: string; name: string }[];
  currentRoleIds: readonly string[];
  orgRoleId: string | null;
  affiliateOnly: boolean;
  orgSid: string;
}): RoleSyncPlan {
  const { env, guildRoles, currentRoleIds, orgRoleId, affiliateOnly, orgSid } =
    input;
  const current = new Set(currentRoleIds);
  const globalIds = globalRoleIds(env);
  const rolesNeedingReview: RoleReviewItem[] = [];

  const orgRoles = guildRoles.filter((role) => isOrgRoleDiscordName(role.name));

  for (const role of orgRoles) {
    if (!current.has(role.id)) {
      continue;
    }

    if (affiliateOnly || role.id !== orgRoleId) {
      appendReviewItem(rolesNeedingReview, {
        roleId: role.id,
        roleName: role.name,
        reason: `Member verified for ${orgSid} but still has @${role.name}`,
      });
    }
  }

  const targetIds = affiliateOnly
    ? resolvePartnerAffiliateOnlyRoleIds(env, currentRoleIds)
    : orgRoleId
      ? [env.AFFILIATE_ROLE_ID, env.VERIFIED_ROLE_ID, orgRoleId]
      : [env.AFFILIATE_ROLE_ID, env.VERIFIED_ROLE_ID];

  const rolesToAdd = targetIds.filter((roleId) => !current.has(roleId));

  return {
    rolesToAdd,
    rolesNeedingReview: rolesNeedingReview.filter(
      (item) => !globalIds.has(item.roleId),
    ),
  };
}
