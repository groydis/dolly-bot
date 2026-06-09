import { createDiscordApiClient } from "../../discord/api";
import { executeDeferredInteraction } from "../../discord/execute-deferred";
import { getInteractionUserId } from "../../discord/interaction-utils";
import type { ComponentInteraction } from "../../discord/types";
import { errorToMessage } from "../../errors";
import type { Env } from "../../env";
import { requireGuild } from "../../guards/guild";
import { isErr } from "../../lib/result";
import { parseVerifyConfirmCustomId } from "../../lib/verify-session";
import { processVerifyConfirm } from "./confirm";
import { verifyError, verifyLog } from "./log";

export async function executeVerifyConfirm(
  env: Env,
  interaction: ComponentInteraction,
): Promise<void> {
  await executeDeferredInteraction({
    applicationId: interaction.application_id,
    interactionToken: interaction.token,
    fallbackMessage:
      "Something went wrong while verifying. Please try again.",
    logLabel: "verify confirm",
    run: async (followUp) => {
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
    },
  });
}
