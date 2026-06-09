import { createDiscordApiClient } from "../../discord/api";
import {
  DEFER_ACK_DELAY_MS,
  getInteractionUserId,
} from "../../discord/interaction-utils";
import { followUpEphemeral } from "../../discord/interactions";
import type { ComponentInteraction } from "../../discord/types";
import { errorToMessage } from "../../errors";
import type { Env } from "../../env";
import { requireGuild } from "../../guards/guild";
import { sleep } from "../../lib/async";
import { isErr } from "../../lib/result";
import { parseVerifyConfirmCustomId } from "../../lib/verify-session";
import { verifyError, verifyLog } from "./log";
import { processVerifyConfirm } from "./confirm";

export async function executeVerifyConfirm(
  env: Env,
  interaction: ComponentInteraction,
): Promise<void> {
  const applicationId = interaction.application_id;
  const followUp = (content: string) =>
    followUpEphemeral(applicationId, interaction.token, { content });

  await sleep(DEFER_ACK_DELAY_MS);

  try {
    const guildResult = requireGuild(interaction, env.DISCORD_GUILD_ID);
    if (isErr(guildResult)) {
      await followUp(errorToMessage(guildResult.error));
      return;
    }

    const userId = getInteractionUserId(interaction);
    if (!userId) {
      await followUp(errorToMessage({ code: "VERIFY_WRONG_USER" }));
      return;
    }

    const sessionId = parseVerifyConfirmCustomId(interaction.data.custom_id);
    if (!sessionId) {
      await followUp(errorToMessage({ code: "VERIFY_SESSION_NOT_FOUND" }));
      return;
    }

    const api = createDiscordApiClient(env);
    const currentRoleIds = interaction.member?.roles ?? [];

    verifyLog("confirm_button_clicked", {
      userId,
      sessionId,
      currentRoleIds: [...currentRoleIds],
    });

    const result = await processVerifyConfirm(
      env,
      api,
      sessionId,
      userId,
      currentRoleIds,
    );

    if (!result.ok) {
      verifyError("confirm_rejected", {
        userId,
        sessionId,
        errorCode: result.error.code,
      });
      await followUp(errorToMessage(result.error));
      return;
    }

    await followUp(result.value);
  } catch (error) {
    console.error("Unhandled verify confirm error", { error });

    try {
      await followUp(
        "Something went wrong while verifying. Please try again.",
      );
    } catch (followUpError) {
      console.error("Failed to send verify confirm follow-up", { followUpError });
    }
  }
}
