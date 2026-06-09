import type { AppError } from "../errors";
import type { ChatInputCommandInteraction } from "../discord/types";
import { err, ok, type Result } from "../lib/result";

export function requireGuild(
  interaction: ChatInputCommandInteraction,
  expectedGuildId: string,
): Result<string, AppError> {
  if (!interaction.guild_id) {
    return err({ code: "NO_GUILD" });
  }

  if (interaction.guild_id !== expectedGuildId) {
    return err({ code: "WRONG_GUILD" });
  }

  return ok(interaction.guild_id);
}
