import { executeDeferredInteraction } from "../../discord/execute-deferred";
import { getInteractionUserId } from "../../discord/interaction-utils";
import type { ModalSubmitInteraction } from "../../discord/types";
import { errorToMessage } from "../../errors";
import type { Env } from "../../env";
import { requireGuild } from "../../guards/guild";
import { isErr } from "../../lib/result";
import {
  VERIFY_MODAL_HANDLE_FIELD,
  VERIFY_MODAL_ORG_FIELD,
  VERIFY_MODAL_PARTNER_ID,
  VERIFY_MODAL_SCANZ_ID,
} from "./constants";
import { parseModalTextField } from "./modals";
import { startVerificationSession } from "./start";

export async function executeVerifyModal(
  env: Env,
  interaction: ModalSubmitInteraction,
): Promise<void> {
  await executeDeferredInteraction({
    applicationId: interaction.application_id,
    interactionToken: interaction.token,
    fallbackMessage:
      "Something went wrong while starting verification. Please try again.",
    logLabel: "verify modal",
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

      const handle = parseModalTextField(interaction, VERIFY_MODAL_HANDLE_FIELD);
      const modalId = interaction.data.custom_id;

      let rawOrg: string | null | undefined;
      if (modalId === VERIFY_MODAL_PARTNER_ID) {
        rawOrg = parseModalTextField(interaction, VERIFY_MODAL_ORG_FIELD);
      } else if (modalId === VERIFY_MODAL_SCANZ_ID) {
        rawOrg = undefined;
      } else {
        await followUp("That verification form is not supported.");
        return;
      }

      const result = await startVerificationSession(
        env.VERIFY_KV,
        userId,
        handle ?? "",
        rawOrg,
      );

      if (!result.ok) {
        await followUp(errorToMessage(result.error));
        return;
      }

      await followUp(result.value);
    },
  });
}
