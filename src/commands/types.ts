import type { DiscordApiClient } from "../discord/api";
import type {
  ActionRow,
  ChatInputCommandInteraction,
  CommandDefinition,
} from "../discord/types";
import type { Env } from "../env";
import type { AppError } from "../errors";
import type { Result } from "../lib/result";

export interface FollowUpPayload {
  content: string;
  components?: ActionRow[];
}

export interface RegisteredCommand {
  definition: CommandDefinition;
  handler: CommandHandler;
  requiresScanzRole?: boolean;
}

export interface CommandContext {
  env: Env;
  interaction: ChatInputCommandInteraction;
  api: DiscordApiClient;
  followUp: (payload: FollowUpPayload | string) => Promise<void>;
}

export type CommandHandler = (
  context: CommandContext,
) => Promise<Result<FollowUpPayload, AppError>>;
