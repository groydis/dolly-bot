import { createDiscordApiClient } from "../discord/api";
import { followUpEphemeral } from "../discord/interactions";
import type { ChatInputCommandInteraction } from "../discord/types";
import { errorToMessage } from "../errors";
import type { Env } from "../env";
import { requireGuild } from "../guards/guild";
import { requireScanzRole } from "../guards/scanz-role";
import { isErr } from "../lib/result";
import { COMMAND_HANDLERS } from "./registry";
import type { CommandContext, CommandHandler } from "./types";

const DEFER_ACK_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSharedGuards(
  env: Env,
  interaction: ChatInputCommandInteraction,
) {
  const guildResult = requireGuild(interaction, env.DISCORD_GUILD_ID);
  if (isErr(guildResult)) {
    return guildResult;
  }

  const roleResult = requireScanzRole(interaction.member, env.SCANZ_ROLE_ID);
  if (isErr(roleResult)) {
    return roleResult;
  }

  return guildResult;
}

export async function executeCommand(
  env: Env,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const commandName = interaction.data.name;
  const handler = COMMAND_HANDLERS.get(commandName);
  const applicationId = interaction.application_id;

  const followUp = (content: string) =>
    followUpEphemeral(applicationId, interaction.token, content);

  // Give Discord time to register the deferred ACK before we PATCH @original.
  await sleep(DEFER_ACK_DELAY_MS);

  try {
    if (!handler) {
      await followUp(errorToMessage({ code: "UNKNOWN_COMMAND" }));
      return;
    }

    const guardResult = await runSharedGuards(env, interaction);
    if (isErr(guardResult)) {
      await followUp(errorToMessage(guardResult.error));
      return;
    }

    // TODO: Add cooldown checks here (e.g. Cloudflare KV: cooldown:{userId})

    const api = createDiscordApiClient(env);
    const context: CommandContext = {
      env,
      interaction,
      api,
      followUp,
    };

    console.log("Command received", {
      command: commandName,
      userId: interaction.member?.user?.id ?? interaction.user?.id,
      guildId: interaction.guild_id,
    });

    const result: Awaited<ReturnType<typeof handler>> = await handler(context);
    if (!result.ok) {
      await followUp(errorToMessage(result.error));
      return;
    }

    await followUp(result.value);
  } catch (error) {
    console.error("Unhandled command error", {
      command: commandName,
      error,
    });

    try {
      await followUp(
        "Something went wrong while running that command. Please try again.",
      );
    } catch (followUpError) {
      console.error("Failed to send error follow-up", { followUpError });
    }
  }
}

export type { CommandHandler };
