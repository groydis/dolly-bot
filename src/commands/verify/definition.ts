import type { CommandDefinition } from "../../discord/types";

export const verifyDefinition: CommandDefinition = {
  name: "verify",
  description: "Verify your RSI account and get SCANZ Discord roles.",
  type: 1,
  options: [
    {
      name: "handle",
      description: "Your RSI handle (e.g. Astro_Ferret).",
      type: 3,
      required: true,
      max_length: 32,
    },
  ],
};
