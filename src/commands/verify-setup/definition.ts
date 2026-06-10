import type { CommandDefinition } from "../../discord/types";
import { ApplicationCommandType } from "../../discord/types";

export const verifySetupDefinition: CommandDefinition = {
  name: "verify-setup",
  description:
    "Staff: post or refresh the RSI verification embed in #verify-rsi.",
  type: ApplicationCommandType.CHAT_INPUT,
};
