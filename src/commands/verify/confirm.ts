import type { DiscordApiClient } from "../../discord/api";
import { DiscordApiError } from "../../discord/api";
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
  classifyPartnerOrgRoles,
  classifyVerificationRoles,
  isAffiliateOnly,
} from "./classify";
import { buildVerifySuccessMessage } from "./format";
import { formatUnknownError, verifyError, verifyLog } from "./log";
import { provisionPartnerOrg } from "./provision-org";
import {
  applyPartnerVerificationRoles,
  applyVerificationRoles,
  buildPartnerNickname,
  truncateNickname,
} from "./roles";
import type { VerifyOutcome } from "./rsi/types";
import {
  extractVerifyCode,
  fetchCitizenPage,
  parseCitizenPage,
} from "./rsi/citizen";
import {
  fetchOrgMembers,
  parseOrgMembersResponse,
} from "./rsi/org-members";

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
  const verificationResult = await runScanzVerificationChecks(session);
  if (!verificationResult.ok) {
    return verificationResult;
  }

  const { classification, handle } = verificationResult.value;
  const affiliateOnly = isAffiliateOnly(classification.roles);
  const nickname = truncateNickname(handle);

  verifyLog("scanz_checks_passed", {
    userId: discordUserId,
    handle,
    affiliateOnly,
    targetRoles: classification.roles,
    reason: classification.reason,
  });

  try {
    await applyVerificationRoles(
      api,
      env,
      guildId,
      discordUserId,
      classification.roles,
      currentRoleIds,
    );
    await api.setMemberNickname(guildId, discordUserId, nickname);
  } catch (error) {
    verifyError("scanz_discord_update_failed", {
      userId: discordUserId,
      handle,
      nickname,
      targetRoles: classification.roles,
      error: formatDiscordApiError(error),
    });
    return err({ code: "VERIFY_DISCORD_UPDATE_FAILED" });
  }

  await deleteVerifySession(env.VERIFY_KV, sessionId);

  verifyLog("scanz_confirm_completed", {
    userId: discordUserId,
    handle,
    affiliateOnly,
  });

  const outcome: VerifyOutcome = {
    path: "scanz",
    handle,
    orgSid: session.orgSid,
    nickname,
    affiliateOnly,
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
  const verificationResult = await runPartnerVerificationChecks(session);
  if (!verificationResult.ok) {
    return verificationResult;
  }

  const { classification, handle } = verificationResult.value;
  const affiliateOnly = classification.orgVerificationFailed;
  const nickname = affiliateOnly
    ? truncateNickname(handle)
    : buildPartnerNickname(session.orgSid, handle);

  let orgRoleId: string | null = null;
  let channelName: string | undefined;

  verifyLog("partner_checks_passed", {
    userId: discordUserId,
    handle,
    orgSid: session.orgSid,
    affiliateOnly,
    classification: classification.roles,
    reason: classification.reason,
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

  if (!parsed.handle || parsed.handle !== session.handle) {
    return err({ code: "VERIFY_HANDLE_MISMATCH" });
  }

  if (
    !parsed.bioText ||
    !extractVerifyCode(parsed.bioText, session.code, session.orgSid)
  ) {
    return err({ code: "VERIFY_CODE_NOT_IN_BIO", orgSid: session.orgSid });
  }

  return ok({ handle: session.handle, mainOrgSid: parsed.mainOrgSid });
}

async function runScanzVerificationChecks(
  session: VerifySession,
): Promise<
  Result<
    {
      handle: string;
      classification: ReturnType<typeof classifyVerificationRoles>;
    },
    AppError
  >
> {
  const citizenResult = await runCitizenChecks(session);
  if (!citizenResult.ok) {
    return citizenResult;
  }

  const orgFound = await lookupOrgRoster(session, "scanz");
  if (!orgFound.ok) {
    return orgFound;
  }

  const classification = classifyVerificationRoles(
    citizenResult.value.mainOrgSid,
    orgFound.value,
  );

  return ok({ handle: citizenResult.value.handle, classification });
}

async function runPartnerVerificationChecks(
  session: VerifySession,
): Promise<
  Result<
    {
      handle: string;
      classification: ReturnType<typeof classifyPartnerOrgRoles>;
    },
    AppError
  >
> {
  const citizenResult = await runCitizenChecks(session);
  if (!citizenResult.ok) {
    return citizenResult;
  }

  const orgFound = await lookupOrgRoster(session, "partner");
  if (!orgFound.ok) {
    return orgFound;
  }

  const classification = classifyPartnerOrgRoles(session.orgSid, orgFound.value);

  return ok({ handle: citizenResult.value.handle, classification });
}

async function lookupOrgRoster(
  session: VerifySession,
  path: "scanz" | "partner",
): Promise<Result<boolean, AppError>> {
  try {
    const orgResult = await fetchOrgMembers(session.handle, session.orgSid);
    const parsed =
      orgResult.status === 200
        ? parseOrgMembersResponse(orgResult.body)
        : { found: false, totalRows: 0 };

    verifyLog("org_roster_check", {
      path,
      handle: session.handle,
      orgSid: session.orgSid,
      httpStatus: orgResult.status,
      totalRows: parsed.totalRows,
      found: parsed.found,
      latencyMs: orgResult.latencyMs,
    });

    return ok(parsed.found);
  } catch (error) {
    verifyError("org_roster_fetch_failed", {
      path,
      handle: session.handle,
      orgSid: session.orgSid,
      error: formatUnknownError(error),
    });
    return err({ code: "RSI_FETCH_FAILED" });
  }
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
