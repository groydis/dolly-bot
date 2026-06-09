import type { DiscordApi } from "../../discord/api";
import type { Env } from "../../env";
import type { VerifyPath } from "../../lib/verify-types";
import { RSI_CITIZEN_BASE } from "../../rsi/constants";
import type { VerifyRoleKey } from "../../rsi/types";
import { verifyError } from "./log";
import { formatRoleKeyMentions } from "./roles";
import type { RoleReviewItem } from "./role-sync";

function formatReviewRoleMentions(items: readonly RoleReviewItem[]): string {
  return items.map((item) => `<@&${item.roleId}>`).join(", ") || "none";
}

export function buildRoleReviewAlert(params: {
  verifyPath: VerifyPath;
  env: Env;
  discordUserId: string;
  handle: string;
  orgSid: string;
  rsiReason: string;
  targetRoleKeys: readonly VerifyRoleKey[];
  rolesNeedingReview: readonly RoleReviewItem[];
  currentRoleIds: readonly string[];
  orgRoleId?: string | null;
}): string {
  const profileUrl = `${RSI_CITIZEN_BASE}/${encodeURIComponent(params.handle)}`;
  const pathLabel = params.verifyPath === "scanz" ? "SCANZ" : params.orgSid;
  const expectedRoles = formatRoleKeyMentions(params.env, params.targetRoleKeys);
  const orgRoleMention =
    params.orgRoleId !== undefined && params.orgRoleId !== null
      ? `, <@&${params.orgRoleId}>`
      : "";

  const lines = [
    "**Verify review needed**",
    `User: <@${params.discordUserId}>`,
    `RSI handle: \`${params.handle}\``,
    `Verify path: ${pathLabel}`,
    `Reason: ${params.rsiReason}`,
    `RSI expects: ${expectedRoles}${orgRoleMention}`,
    "",
    "**Roles to review (not auto-removed):**",
    ...params.rolesNeedingReview.map(
      (item) =>
        `- <@&${item.roleId}>${item.roleName ? ` (@${item.roleName})` : ""}: ${item.reason}`,
    ),
    "",
    `Roles flagged: ${formatReviewRoleMentions(params.rolesNeedingReview)}`,
    `Profile: ${profileUrl}`,
  ];

  return lines.join("\n");
}

export async function postRoleReviewAlert(
  env: Env,
  api: DiscordApi,
  params: {
    verifyPath: VerifyPath;
    discordUserId: string;
    handle: string;
    orgSid: string;
    rsiReason: string;
    targetRoleKeys: readonly VerifyRoleKey[];
    rolesNeedingReview: readonly RoleReviewItem[];
    currentRoleIds: readonly string[];
    orgRoleId?: string | null;
  },
): Promise<void> {
  if (params.rolesNeedingReview.length === 0) {
    return;
  }

  const content = buildRoleReviewAlert({ env, ...params });

  try {
    await api.postSimpleMessage(env.AUDIT_CHANNEL_ID, content);
  } catch (error) {
    verifyError("role_review_alert_failed", {
      userId: params.discordUserId,
      handle: params.handle,
      verifyPath: params.verifyPath,
      error,
    });
  }
}
