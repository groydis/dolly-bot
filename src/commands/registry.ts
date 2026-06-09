import type { CommandDefinition } from "../discord/types";
import type { RegisteredCommand } from "./types";
import { pingHelpDefinition } from "./ping-help/definition";
import { handlePingHelpCommand } from "./ping-help/handler";
import { pingDefinition } from "./ping/definition";
import { handlePingCommand } from "./ping/handler";

export const REGISTERED_COMMANDS: RegisteredCommand[] = [
  {
    definition: pingDefinition,
    handler: handlePingCommand,
  },
  {
    definition: pingHelpDefinition,
    handler: handlePingHelpCommand,
  },
];

export const ALL_COMMANDS: CommandDefinition[] = REGISTERED_COMMANDS.map(
  (command) => command.definition,
);

export const COMMAND_HANDLERS = new Map(
  REGISTERED_COMMANDS.map((command) => [command.definition.name, command.handler]),
);
