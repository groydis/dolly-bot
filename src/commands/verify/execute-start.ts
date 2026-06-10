import { ephemeralResponse } from "../../discord/interactions";
import type { ComponentInteraction, InteractionResponse } from "../../discord/types";
import { errorToMessage } from "../../errors";
import type { Env } from "../../env";
import { requireGuild } from "../../guards/guild";
import { isErr } from "../../lib/result";
import {
  VERIFY_START_PARTNER_ID,
  VERIFY_START_SCANZ_ID,
} from "./constants";
import {
  buildPartnerVerifyModalResponse,
  buildScanzVerifyModalResponse,
} from "./modals";

export function handleVerifyStartButton(
  env: Env,
  interaction: ComponentInteraction,
): InteractionResponse {
  const guildResult = requireGuild(interaction, env.DISCORD_GUILD_ID);
  if (isErr(guildResult)) {
    return ephemeralResponse(errorToMessage(guildResult.error));
  }

  const customId = interaction.data.custom_id;

  if (customId === VERIFY_START_SCANZ_ID) {
    return buildScanzVerifyModalResponse();
  }

  if (customId === VERIFY_START_PARTNER_ID) {
    return buildPartnerVerifyModalResponse();
  }

  return ephemeralResponse("That button is not supported.");
}
