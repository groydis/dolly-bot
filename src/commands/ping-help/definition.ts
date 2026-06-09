import type { CommandDefinition } from "../../discord/types";
import { ApplicationCommandType } from "../../discord/types";

export const pingHelpDefinition: CommandDefinition = {
  name: "ping-help",
  description: "How to use Dolly Bot's activity ping feature.",
  type: ApplicationCommandType.CHAT_INPUT,
};
