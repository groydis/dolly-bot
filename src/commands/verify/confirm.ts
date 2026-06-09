import type { DiscordApiClient } from "../../discord/api";
import type { Env } from "../../env";
import type { AppError } from "../../errors";
import {
  deleteVerifySession,
  getVerifySession,
  type VerifySession,
} from "../../lib/verify-session";
import { err, ok, type Result } from "../../lib/result";
import { classifyVerificationRoles, isAffiliateOnly } from "./classify";
import { buildVerifySuccessMessage } from "./format";
import {
  applyVerificationRoles,
  truncateNickname,
} from "./roles";
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

  const verificationResult = await runVerificationChecks(session);
  if (!verificationResult.ok) {
    return verificationResult;
  }

  const { classification, handle } = verificationResult.value;
  const guildId = env.DISCORD_GUILD_ID;

  try {
    await applyVerificationRoles(
      api,
      env,
      guildId,
      discordUserId,
      classification.roles,
      currentRoleIds,
    );
    await api.setMemberNickname(
      guildId,
      discordUserId,
      truncateNickname(handle),
    );
  } catch {
    return err({ code: "VERIFY_DISCORD_UPDATE_FAILED" });
  }

  await deleteVerifySession(env.VERIFY_KV, sessionId);

  return ok(
    buildVerifySuccessMessage(handle, isAffiliateOnly(classification.roles)),
  );
}

async function runVerificationChecks(
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

  if (!parsed.bioText || !extractVerifyCode(parsed.bioText, session.code)) {
    return err({ code: "VERIFY_CODE_NOT_IN_BIO" });
  }

  let orgFound = false;

  try {
    const orgResult = await fetchOrgMembers(session.handle);
    if (orgResult.status === 200) {
      orgFound = parseOrgMembersResponse(orgResult.body).found;
    }
  } catch {
    return err({ code: "RSI_FETCH_FAILED" });
  }

  const classification = classifyVerificationRoles(
    parsed.mainOrgSid,
    orgFound,
  );

  return ok({ handle: session.handle, classification });
}
