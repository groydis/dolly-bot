import { getActivityChoices } from "../../config/activities";
import { PING_DESCRIPTION_MAX_LENGTH } from "../../discord/constants";
import type { CommandDefinition } from "../../discord/types";
import { ApplicationCommandOptionType, ApplicationCommandType } from "../../discord/types";

export const pingDefinition: CommandDefinition = {
  name: "ping",
  description: "Ping an activity role and invite people to join your voice channel.",
  type: ApplicationCommandType.CHAT_INPUT,
  options: [
    {
      name: "activity",
      description: "The activity you want to ping.",
      type: ApplicationCommandOptionType.STRING,
      required: true,
      choices: getActivityChoices(),
    },
    {
      name: "description",
      description: "Details about what you are doing.",
      type: ApplicationCommandOptionType.STRING,
      required: true,
      max_length: PING_DESCRIPTION_MAX_LENGTH,
    },
  ],
};
