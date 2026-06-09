import type { CommandDefinition } from "../../discord/types";
import { ApplicationCommandOptionType, ApplicationCommandType } from "../../discord/types";
import {
  ORG_SYMBOL_MAX_LENGTH,
  RSI_HANDLE_MAX_LENGTH,
} from "../../lib/rsi-limits";

export const verifyDefinition: CommandDefinition = {
  name: "verify",
  description:
    "Verify your RSI account. Defaults to SCANZ; use org for partner orgs.",
  type: ApplicationCommandType.CHAT_INPUT,
  options: [
    {
      name: "handle",
      description: "Your RSI handle (e.g. Astro_Ferret).",
      type: ApplicationCommandOptionType.STRING,
      required: true,
      max_length: RSI_HANDLE_MAX_LENGTH,
    },
    {
      name: "org",
      description:
        "Partner org RSI symbol (e.g. ZAP). Omit or use SCANZ for SCANZ verify.",
      type: ApplicationCommandOptionType.STRING,
      required: false,
      max_length: ORG_SYMBOL_MAX_LENGTH,
    },
  ],
};
