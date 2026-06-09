import type { CommandDefinition } from "../discord/types";
import type { RegisteredCommand } from "./types";
import { pingHelpDefinition } from "./ping-help/definition";
import { handlePingHelpCommand } from "./ping-help/handler";
import { pingDefinition } from "./ping/definition";
import { handlePingCommand } from "./ping/handler";
import { auditDefinition } from "./audit/definition";
import { handleAuditCommand } from "./audit/handler";
import { verifyDefinition } from "./verify/definition";
import { handleVerifyCommand } from "./verify/handler";

export const REGISTERED_COMMANDS: RegisteredCommand[] = [
  {
    definition: pingDefinition,
    handler: handlePingCommand,
    requiresScanzRole: true,
  },
  {
    definition: pingHelpDefinition,
    handler: handlePingHelpCommand,
    requiresScanzRole: true,
  },
  {
    definition: verifyDefinition,
    handler: handleVerifyCommand,
    requiresScanzRole: false,
  },
  {
    definition: auditDefinition,
    handler: handleAuditCommand,
    requiresScanzRole: false,
    requiresStaffRole: true,
  },
];

export const ALL_COMMANDS: CommandDefinition[] = REGISTERED_COMMANDS.map(
  (command) => command.definition,
);

export const COMMAND_HANDLERS = new Map(
  REGISTERED_COMMANDS.map((command) => [command.definition.name, command]),
);
