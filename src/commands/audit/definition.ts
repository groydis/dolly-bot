import type { CommandDefinition } from "../../discord/types";

export const auditDefinition: CommandDefinition = {
  name: "audit",
  description:
    "Staff: re-check RSI verify records and report role drift (manual review).",
  type: 1,
  options: [
    {
      name: "user",
      description: "Audit a single member (optional). Omit to audit everyone.",
      type: 6,
      required: false,
    },
  ],
};
