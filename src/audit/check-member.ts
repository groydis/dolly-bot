import type { DiscordApiClient } from "../discord/api";
import {
  classifyPartnerOrgRoles,
  classifyVerificationRoles,
} from "../commands/verify/classify";
import {
  fetchCitizenPage,
  parseCitizenPage,
} from "../commands/verify/rsi/citizen";
import {
  fetchOrgMembers,
  parseOrgMembersResponse,
} from "../commands/verify/rsi/org-members";
import type { VerifyRecord } from "../db/verify-records";
import type { Env } from "../env";
import { SCANZ_SID } from "../lib/org-symbol";
import { detectDrift, roleIdsToNames } from "./detect-drift";
import type { MemberAuditResult } from "./types";

const RSI_DELAY_MS = 750;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkMemberAudit(
  env: Env,
  api: DiscordApiClient,
  record: VerifyRecord,
  roleIdToName: Map<string, string>,
): Promise<MemberAuditResult> {
  let citizenResult: Awaited<ReturnType<typeof fetchCitizenPage>>;

  try {
    citizenResult = await fetchCitizenPage(record.rsiHandle);
  } catch {
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

  await sleep(RSI_DELAY_MS);

  const parsed =
    citizenResult.status === 200
      ? parseCitizenPage(citizenResult.html)
      : { handle: null, mainOrgSid: null, bioText: null };

  let orgFound = false;
  let expectedRoleKeys: string[] = [];
  let rsiReason = "";

  if (citizenResult.status === 200) {
    const orgSid =
      record.verifyPath === "scanz" ? SCANZ_SID : record.orgSid;

    const rosterHandle = parsed.handle ?? record.rsiHandle;

    try {
      const orgResult = await fetchOrgMembers(rosterHandle, orgSid);
      orgFound =
        orgResult.status === 200
          ? parseOrgMembersResponse(orgResult.body, rosterHandle).found
          : false;
    } catch {
      return buildResult(record, roleIdToName, {
        driftTypes: ["rsi_unreachable"],
        issue: "Could not reach RSI org roster API",
        hasDrift: false,
        inconclusive: true,
        expectedRoleKeys: [],
        rsiReason: "",
        citizenHandle: parsed.handle,
      });
    }

    await sleep(RSI_DELAY_MS);

    if (record.verifyPath === "scanz") {
      const classification = classifyVerificationRoles(
        parsed.mainOrgSid,
        orgFound,
      );
      expectedRoleKeys = [...classification.roles];
      rsiReason = classification.reason;
    } else {
      const classification = classifyPartnerOrgRoles(record.orgSid, orgFound);
      expectedRoleKeys = classification.orgVerificationFailed
        ? ["affiliate"]
        : [...classification.roles];
      rsiReason = classification.reason;
    }
  }

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
      citizenHandle: parsed.handle,
    });
  }

  const drift = detectDrift(env, {
    verifyPath: record.verifyPath,
    orgSid: record.orgSid,
    storedHandle: record.rsiHandle,
    citizenHandle: parsed.handle,
    citizenStatus: citizenResult.status,
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
    citizenHandle: parsed.handle,
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
