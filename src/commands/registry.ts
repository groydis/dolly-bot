import type { CommandDefinition } from "../discord/types";
import type { RegisteredCommand } from "./types";
import { pingDefinition } from "./ping/definition";
import { handlePingCommand } from "./ping/handler";

export const REGISTERED_COMMANDS: RegisteredCommand[] = [
  {
    definition: pingDefinition,
    handler: handlePingCommand,
  },
];

export const ALL_COMMANDS: CommandDefinition[] = REGISTERED_COMMANDS.map(
  (command) => command.definition,
);

export const COMMAND_HANDLERS = new Map(
  REGISTERED_COMMANDS.map((command) => [command.definition.name, command.handler]),
);
