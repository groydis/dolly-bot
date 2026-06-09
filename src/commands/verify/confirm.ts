import type { DiscordApiClient } from "../../discord/api";
import { DiscordApiError } from "../../discord/api";
import { upsertVerifyRecord } from "../../db/verify-records";
import type { VerifyPath } from "../../db/verify-records";
import type { Env } from "../../env";
import type { AppError } from "../../errors";
import { isScanzPath } from "../../lib/org-symbol";
import {
  deleteVerifySession,
  getVerifySession,
  type VerifySession,
} from "../../lib/verify-session";
import { err, ok, type Result } from "../../lib/result";
import {
  expectedRolesForPath,
  rosterOrgSidForPath,
} from "../../rsi/expected-roles";
import {
  citizenHandlesMatch,
  extractVerifyCode,
  fetchCitizenPage,
  parseCitizenPage,
} from "../../rsi/citizen";
import { fetchOrgRosterLookup } from "../../rsi/lookup-membership";
import type {
  PartnerRoleClassification,
  RoleClassification,
} from "../../rsi/types";
import { isAffiliateOnly } from "./classify";
import { buildVerifySuccessMessage } from "./format";
import { formatUnknownError, verifyError, verifyLog } from "./log";
import { provisionPartnerOrg } from "./provision-org";
import { postScanzRoleReviewAlert } from "./scanz-review-alert";
import {
  applyPartnerVerificationRoles,
  applyVerificationRoles,
  buildPartnerNickname,
  truncateNickname,
} from "./roles";
import type { VerifyOutcome } from "./rsi/types";

export async function processVerifyConfirm(
  env: Env,
  api: DiscordApiClient,
  sessionId: string,
  discordUserId: string,
  currentRoleIds: readonly string[],
): Promise<Result<string, AppError>> {
  const session = await getVerifySession(env.VERIFY_KV, sessionId);
  if (!session) {
    return err({ code: "VERIFY_SESSION_EXPIRED" });
  }

  if (session.discordUserId !== discordUserId) {
    return err({ code: "VERIFY_WRONG_USER" });
  }

  const guildId = env.DISCORD_GUILD_ID;

  verifyLog("confirm_started", {
    sessionId,
    userId: discordUserId,
    handle: session.handle,
    orgSid: session.orgSid,
    path: isScanzPath(session.orgSid) ? "scanz" : "partner",
    currentRoleIds: [...currentRoleIds],
  });

  if (isScanzPath(session.orgSid)) {
    return processScanzVerifyConfirm(
      env,
      api,
      session,
      sessionId,
      discordUserId,
      currentRoleIds,
      guildId,
    );
  }

  return processPartnerVerifyConfirm(
    env,
    api,
    session,
    sessionId,
    discordUserId,
    currentRoleIds,
    guildId,
  );
}

async function processScanzVerifyConfirm(
  env: Env,
  api: DiscordApiClient,
  session: VerifySession,
  sessionId: string,
  discordUserId: string,
  currentRoleIds: readonly string[],
  guildId: string,
): Promise<Result<string, AppError>> {
  const verificationResult = await runVerificationChecks(session, "scanz");
  if (!verificationResult.ok) {
    return verificationResult;
  }

  const { classification, handle } = verificationResult.value;
  const scanzClassification = classification as RoleClassification;
  const affiliateOnly = isAffiliateOnly(scanzClassification.roles);
  const nickname = truncateNickname(handle);

  verifyLog("scanz_checks_passed", {
    userId: discordUserId,
    handle,
    affiliateOnly,
    targetRoles: scanzClassification.roles,
    reason: scanzClassification.reason,
  });

  let scanzRoleReviewNeeded = false;

  try {
    const roleResult = await applyVerificationRoles(
      api,
      env,
      guildId,
      discordUserId,
      scanzClassification.roles,
      currentRoleIds,
    );
    scanzRoleReviewNeeded = roleResult.scanzRoleReviewNeeded;
    await api.setMemberNickname(guildId, discordUserId, nickname);
  } catch (error) {
    verifyError("scanz_discord_update_failed", {
      userId: discordUserId,
      handle,
      nickname,
      targetRoles: scanzClassification.roles,
      error: formatDiscordApiError(error),
    });
    return err({ code: "VERIFY_DISCORD_UPDATE_FAILED" });
  }

  if (scanzRoleReviewNeeded) {
    await postScanzRoleReviewAlert(env, api, {
      discordUserId,
      handle,
      reason: scanzClassification.reason,
      targetRoles: scanzClassification.roles,
      currentRoleIds,
    });
  }

  await upsertVerifyRecord(env.VERIFY_DB, {
    discordUserId,
    rsiHandle: handle,
    verifyPath: "scanz",
    orgSid: session.orgSid,
    grantedRoles: scanzClassification.roles,
    partnerOrgRoleId: null,
  });

  await deleteVerifySession(env.VERIFY_KV, sessionId);

  verifyLog("scanz_confirm_completed", {
    userId: discordUserId,
    handle,
    affiliateOnly,
    scanzRoleReviewNeeded,
  });

  const outcome: VerifyOutcome = {
    path: "scanz",
    handle,
    orgSid: session.orgSid,
    nickname,
    affiliateOnly,
    scanzRoleReviewNeeded: scanzRoleReviewNeeded || undefined,
  };

  return ok(buildVerifySuccessMessage(outcome));
}

async function processPartnerVerifyConfirm(
  env: Env,
  api: DiscordApiClient,
  session: VerifySession,
  sessionId: string,
  discordUserId: string,
  currentRoleIds: readonly string[],
  guildId: string,
): Promise<Result<string, AppError>> {
  const verificationResult = await runVerificationChecks(session, "partner");
  if (!verificationResult.ok) {
    return verificationResult;
  }

  const { classification, handle } = verificationResult.value;
  const partnerClassification = classification as PartnerRoleClassification;
  const affiliateOnly = partnerClassification.orgVerificationFailed;
  const nickname = buildPartnerNickname(session.orgSid, handle);

  let orgRoleId: string | null = null;
  let channelName: string | undefined;

  verifyLog("partner_checks_passed", {
    userId: discordUserId,
    handle,
    orgSid: session.orgSid,
    affiliateOnly,
    classification: partnerClassification.roles,
    reason: partnerClassification.reason,
  });

  if (!affiliateOnly) {
    try {
      const provisioned = await provisionPartnerOrg(
        api,
        env,
        guildId,
        session.orgSid,
      );
      orgRoleId = provisioned.orgRoleId;
      channelName = provisioned.channelName;
      verifyLog("partner_org_provisioned", {
        orgSid: session.orgSid,
        orgRoleId,
        channelName,
        channelCreated: provisioned.channelCreated,
      });
    } catch (error) {
      verifyError("partner_org_provision_failed", {
        userId: discordUserId,
        handle,
        orgSid: session.orgSid,
        error: formatDiscordApiError(error),
      });
      return err({ code: "VERIFY_ORG_PROVISION_FAILED" });
    }
  }

  try {
    await applyPartnerVerificationRoles(
      api,
      env,
      guildId,
      discordUserId,
      orgRoleId,
      affiliateOnly,
      currentRoleIds,
    );
    await api.setMemberNickname(guildId, discordUserId, nickname);
  } catch (error) {
    verifyError("partner_discord_update_failed", {
      userId: discordUserId,
      handle,
      orgSid: session.orgSid,
      affiliateOnly,
      orgRoleId,
      nickname,
      error: formatDiscordApiError(error),
    });
    return err({
      code: "VERIFY_DISCORD_UPDATE_FAILED",
      partnerRosterMiss: affiliateOnly,
      orgSid: affiliateOnly ? session.orgSid : undefined,
    });
  }

  await upsertVerifyRecord(env.VERIFY_DB, {
    discordUserId,
    rsiHandle: handle,
    verifyPath: "partner",
    orgSid: session.orgSid,
    grantedRoles: partnerClassification.roles,
    partnerOrgRoleId: orgRoleId,
  });

  await deleteVerifySession(env.VERIFY_KV, sessionId);

  verifyLog("partner_confirm_completed", {
    userId: discordUserId,
    handle,
    orgSid: session.orgSid,
    affiliateOnly,
    channelName,
  });

  const outcome: VerifyOutcome = {
    path: "partner",
    handle,
    orgSid: session.orgSid,
    nickname,
    affiliateOnly,
    channelName,
  };

  return ok(buildVerifySuccessMessage(outcome));
}

async function runCitizenChecks(
  session: VerifySession,
): Promise<
  Result<
    {
      handle: string;
      mainOrgSid: string | null;
    },
    AppError
  >
> {
  let citizenResult: Awaited<ReturnType<typeof fetchCitizenPage>>;

  try {
    citizenResult = await fetchCitizenPage(session.handle);
  } catch {
    return err({ code: "RSI_FETCH_FAILED" });
  }

  if (citizenResult.status === 404) {
    return err({ code: "RSI_HANDLE_NOT_FOUND" });
  }

  if (citizenResult.status !== 200) {
    return err({ code: "RSI_FETCH_FAILED" });
  }

  const parsed = parseCitizenPage(citizenResult.html);

  if (!citizenHandlesMatch(session.handle, parsed.handle)) {
    return err({ code: "VERIFY_HANDLE_MISMATCH" });
  }

  if (
    !parsed.bioText ||
    !extractVerifyCode(parsed.bioText, session.code, session.orgSid)
  ) {
    return err({ code: "VERIFY_CODE_NOT_IN_BIO", orgSid: session.orgSid });
  }

  return ok({
    handle: parsed.handle!,
    mainOrgSid: parsed.mainOrgSid,
  });
}

async function runVerificationChecks(
  session: VerifySession,
  verifyPath: VerifyPath,
): Promise<
  Result<
    {
      handle: string;
      classification: RoleClassification | PartnerRoleClassification;
    },
    AppError
  >
> {
  const citizenResult = await runCitizenChecks(session);
  if (!citizenResult.ok) {
    return citizenResult;
  }

  const rosterOrgSid = rosterOrgSidForPath(verifyPath, session.orgSid);
  const orgLookup = await fetchOrgRosterLookup(
    citizenResult.value.handle,
    rosterOrgSid,
  );

  verifyLog("org_roster_check", {
    path: verifyPath,
    handle: citizenResult.value.handle,
    orgSid: session.orgSid,
    httpStatus: orgLookup.status,
    totalRows: orgLookup.totalRows,
    found: orgLookup.found,
    latencyMs: orgLookup.latencyMs,
  });

  if (orgLookup.fetchFailed) {
    verifyError("org_roster_fetch_failed", {
      path: verifyPath,
      handle: citizenResult.value.handle,
      orgSid: session.orgSid,
      error: "fetch threw",
    });
    return err({ code: "RSI_FETCH_FAILED" });
  }

  const rolesResult = expectedRolesForPath({
    verifyPath,
    orgSid: session.orgSid,
    mainOrgSid: citizenResult.value.mainOrgSid,
    orgFound: orgLookup.found,
  });

  return ok({
    handle: citizenResult.value.handle,
    classification: rolesResult.classification,
  });
}

function formatDiscordApiError(error: unknown): Record<string, unknown> {
  if (error instanceof DiscordApiError) {
    return {
      operation: error.operation,
      status: error.status,
      body: error.body,
    };
  }

  return formatUnknownError(error);
}
