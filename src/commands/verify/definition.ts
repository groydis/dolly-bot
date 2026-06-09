import type { CommandDefinition } from "../../discord/types";

export const verifyDefinition: CommandDefinition = {
  name: "verify",
  description:
    "Verify your RSI account. Defaults to SCANZ; use org for partner orgs.",
  type: 1,
  options: [
    {
      name: "handle",
      description: "Your RSI handle (e.g. Astro_Ferret).",
      type: 3,
      required: true,
      max_length: 32,
    },
    {
      name: "org",
      description:
        "Partner org RSI symbol (e.g. ZAP). Omit or use SCANZ for SCANZ verify.",
      type: 3,
      required: false,
      max_length: 10,
    },
  ],
};
