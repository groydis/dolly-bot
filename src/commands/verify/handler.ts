import type { AppError } from "../../errors";
import { getInteractionUserId } from "../../discord/interaction-utils";
import { isValidOrgSymbol } from "../../lib/org-symbol";
import { parseStringOption } from "../../lib/options";
import { err, ok, type Result } from "../../lib/result";
import type { FollowUpPayload } from "../types";
import type { CommandContext } from "../types";
import { startVerificationSession } from "./start";

export async function handleVerifyCommand(
  context: CommandContext,
): Promise<Result<FollowUpPayload, AppError>> {
  const { env, interaction } = context;
  const userId = getInteractionUserId(interaction);

  if (!userId) {
    return err({ code: "VERIFY_WRONG_USER" });
  }

  const handle = parseStringOption(interaction, "handle");
  const rawOrg = parseStringOption(interaction, "org");
  if (rawOrg !== undefined && !isValidOrgSymbol(rawOrg)) {
    return err({ code: "INVALID_ORG_SYMBOL" });
  }

  return startVerificationSession(
    env.VERIFY_KV,
    userId,
    handle ?? "",
    rawOrg,
  );
}
