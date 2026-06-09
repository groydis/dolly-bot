import type { DiscordApiClient } from "../discord/api";
import type {
  ChatInputCommandInteraction,
  CommandDefinition,
} from "../discord/types";
import type { Env } from "../env";
import type { AppError } from "../errors";
import type { Result } from "../lib/result";

export interface RegisteredCommand {
  definition: CommandDefinition;
  handler: CommandHandler;
}

export interface CommandContext {
  env: Env;
  interaction: ChatInputCommandInteraction;
  api: DiscordApiClient;
  followUp: (content: string) => Promise<void>;
}

export type CommandHandler = (
  context: CommandContext,
) => Promise<Result<string, AppError>>;
