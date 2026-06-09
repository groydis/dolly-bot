import type { DiscordApi } from "../discord/api";
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
  /** When set, executeCommand runs the first audit batch after replying. */
  auditRunId?: string;
}

export interface RegisteredCommand {
  definition: CommandDefinition;
  handler: CommandHandler;
  requiresScanzRole?: boolean;
  requiresStaffRole?: boolean;
}

export interface CommandContext {
  env: Env;
  interaction: ChatInputCommandInteraction;
  api: DiscordApi;
  followUp: (payload: FollowUpPayload | string) => Promise<void>;
}

export type CommandHandler = (
  context: CommandContext,
) => Promise<Result<FollowUpPayload, AppError>>;
