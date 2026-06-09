import type { DiscordApi } from "../discord/api";
import type { VerifyRecord } from "../db/verify-records";
import type { Env } from "../env";
import { isHttpOk } from "../lib/http-status";
import { RSI_REQUEST_DELAY_MS } from "../rsi/constants";
import { expectedRoleKeysForPath } from "../rsi/expected-roles";
import { lookupRsiMembership } from "../rsi/lookup-membership";
import { detectDrift, roleIdsToNames } from "./detect-drift";
import type { MemberAuditResult } from "./types";

/**
 * Batch audit marks RSI/Discord fetch failures as inconclusive (no drift, no timestamp touch)
 * so the run continues. Verify returns hard AppError because one user is waiting inline.
 */
export async function checkMemberAudit(
  env: Env,
  api: DiscordApi,
  record: VerifyRecord,
  roleIdToName: Map<string, string>,
): Promise<MemberAuditResult> {
  const lookup = await lookupRsiMembership({
    handle: record.rsiHandle,
    verifyPath: record.verifyPath,
    orgSid: record.orgSid,
    rateLimitMs: RSI_REQUEST_DELAY_MS,
  });

  if (lookup.citizenFetchFailed) {
    return buildResult(record, roleIdToName, {
      driftTypes: ["rsi_unreachable"],
      issue: "Could not reach RSI citizen page",
      hasDrift: false,
      inconclusive: true,
      expectedRoleKeys: [],
      rsiReason: "",
      citizenHandle: null,
    });
  }

  if (lookup.orgFetchFailed) {
    return buildResult(record, roleIdToName, {
      driftTypes: ["rsi_unreachable"],
      issue: "Could not reach RSI org roster API",
      hasDrift: false,
      inconclusive: true,
      expectedRoleKeys: [],
      rsiReason: "",
      citizenHandle: lookup.parsedCitizen?.handle ?? null,
    });
  }

  const { expectedRoleKeys, rsiReason } =
    isHttpOk(lookup.citizenStatus)
      ? expectedRoleKeysForPath({
          verifyPath: record.verifyPath,
          orgSid: record.orgSid,
          mainOrgSid: lookup.parsedCitizen?.mainOrgSid ?? null,
          orgFound: lookup.orgFound,
        })
      : { expectedRoleKeys: [], rsiReason: "" };

  let currentRoleIds: string[] = [];

  try {
    const member = await api.getGuildMember(
      env.DISCORD_GUILD_ID,
      record.discordUserId,
    );
    currentRoleIds = member.roles;
  } catch {
    return buildResult(record, roleIdToName, {
      driftTypes: ["rsi_unreachable"],
      issue: "Could not fetch Discord member (may have left the server)",
      hasDrift: false,
      inconclusive: true,
      expectedRoleKeys,
      rsiReason,
      citizenHandle: lookup.parsedCitizen?.handle ?? null,
    });
  }

  const drift = detectDrift(env, {
    verifyPath: record.verifyPath,
    orgSid: record.orgSid,
    storedHandle: record.rsiHandle,
    citizenHandle: lookup.parsedCitizen?.handle ?? null,
    citizenStatus: lookup.citizenStatus,
    expectedRoleKeys,
    currentRoleIds,
    partnerOrgRoleId: record.partnerOrgRoleId,
    rsiReason,
    roleIdToName,
  });

  return buildResult(record, roleIdToName, {
    ...drift,
    expectedRoleKeys,
    rsiReason,
    citizenHandle: lookup.parsedCitizen?.handle ?? null,
    currentRoleIds,
  });
}

function buildResult(
  record: VerifyRecord,
  roleIdToName: Map<string, string>,
  data: {
    driftTypes: MemberAuditResult["driftTypes"];
    issue: string;
    hasDrift: boolean;
    inconclusive: boolean;
    expectedRoleKeys: string[];
    rsiReason: string;
    citizenHandle: string | null;
    currentRoleIds?: string[];
  },
): MemberAuditResult {
  const roleIds = data.currentRoleIds ?? [];

  return {
    discordUserId: record.discordUserId,
    rsiHandle: record.rsiHandle,
    verifyPath: record.verifyPath,
    orgSid: record.orgSid,
    verifiedAt: record.verifiedAt,
    driftTypes: data.driftTypes,
    issue: data.issue,
    discordRoleNames: roleIdsToNames(roleIds, roleIdToName),
    expectedRoleKeys: data.expectedRoleKeys,
    rsiReason: data.rsiReason,
    hasDrift: data.hasDrift,
    inconclusive: data.inconclusive,
  };
}
