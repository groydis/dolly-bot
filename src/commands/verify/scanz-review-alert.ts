import type { DiscordApiClient } from "../../discord/api";
import type { Env } from "../../env";
import { RSI_CITIZEN_BASE } from "./rsi/citizen";
import type { VerifyRoleKey } from "./rsi/types";
import { getRoleIdForKey } from "./roles";
import { verifyError } from "./log";

function formatRoleMentions(
  env: Env,
  roleKeys: readonly VerifyRoleKey[],
): string {
  return roleKeys.map((key) => `<@&${getRoleIdForKey(env, key)}>`).join(", ");
}

function formatCurrentScanzRoles(
  env: Env,
  currentRoleIds: readonly string[],
): string {
  const parts: string[] = [];

  if (currentRoleIds.includes(env.SCANZ_ROLE_ID)) {
    parts.push(`<@&${env.SCANZ_ROLE_ID}>`);
  }

  if (currentRoleIds.includes(env.VERIFIED_ROLE_ID)) {
    parts.push(`<@&${env.VERIFIED_ROLE_ID}>`);
  }

  if (currentRoleIds.includes(env.AFFILIATE_ROLE_ID)) {
    parts.push(`<@&${env.AFFILIATE_ROLE_ID}>`);
  }

  return parts.join(", ") || "none";
}

export function buildScanzRoleReviewAlert(params: {
  env: Env;
  discordUserId: string;
  handle: string;
  reason: string;
  targetRoles: readonly VerifyRoleKey[];
  currentRoleIds: readonly string[];
}): string {
  const profileUrl = `${RSI_CITIZEN_BASE}/${encodeURIComponent(params.handle)}`;

  return [
    "**Verify review needed**",
    `User: <@${params.discordUserId}>`,
    `RSI handle: \`${params.handle}\``,
    "Issue: Has @SCANZ but RSI verification does not support SCANZ membership",
    `Reason: ${params.reason}`,
    `Discord roles: ${formatCurrentScanzRoles(params.env, params.currentRoleIds)}`,
    `RSI expects: ${formatRoleMentions(params.env, params.targetRoles)}`,
    `Profile: ${profileUrl}`,
  ].join("\n");
}

export async function postScanzRoleReviewAlert(
  env: Env,
  api: DiscordApiClient,
  params: {
    discordUserId: string;
    handle: string;
    reason: string;
    targetRoles: readonly VerifyRoleKey[];
    currentRoleIds: readonly string[];
  },
): Promise<void> {
  const content = buildScanzRoleReviewAlert({ env, ...params });

  try {
    await api.postSimpleMessage(env.AUDIT_CHANNEL_ID, content);
  } catch (error) {
    verifyError("scanz_role_review_alert_failed", {
      userId: params.discordUserId,
      handle: params.handle,
      error,
    });
  }
}
