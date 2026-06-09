import type { AppError } from "../../errors";
import { parseStringOption } from "../../lib/options";
import { err, ok, type Result } from "../../lib/result";
import { createVerifySession } from "../../lib/verify-session";
import { isValidRsiHandle } from "../../lib/validate-handle";
import type { FollowUpPayload } from "../types";
import type { CommandContext } from "../types";
import { buildVerifyButton } from "./components";
import { buildVerifyInstructions } from "./format";

function getInteractionUserId(
  interaction: CommandContext["interaction"],
): string | undefined {
  return interaction.member?.user?.id ?? interaction.user?.id;
}

export async function handleVerifyCommand(
  context: CommandContext,
): Promise<Result<FollowUpPayload, AppError>> {
  const { env, interaction } = context;
  const userId = getInteractionUserId(interaction);

  if (!userId) {
    return err({ code: "VERIFY_WRONG_USER" });
  }

  const handle = parseStringOption(interaction, "handle");
  if (!handle || !isValidRsiHandle(handle)) {
    return err({ code: "INVALID_RSI_HANDLE" });
  }

  const session = await createVerifySession(env.VERIFY_KV, userId, handle);

  return ok({
    content: buildVerifyInstructions(handle, session.code),
    components: buildVerifyButton(session.sessionId),
  });
}
