import { processAuditRunBatch } from "../audit/process-audit-run";
import { isCooldownExempt } from "../config/cooldown";
import { createDiscordApiClient } from "../discord/api";
import { executeDeferredInteraction } from "../discord/execute-deferred";
import { getInteractionUserId } from "../discord/interaction-utils";
import type { ChatInputCommandInteraction } from "../discord/types";
import { errorToMessage } from "../errors";
import type { Env } from "../env";
import { checkPingCooldown, setPingCooldown } from "../guards/cooldown";
import { requireGuild } from "../guards/guild";
import { requireScanzRole } from "../guards/scanz-role";
import { requireStaffRole } from "../guards/staff-role";
import { isErr } from "../lib/result";
import { COMMAND_HANDLERS } from "./registry";
import type {
  CommandContext,
  CommandHandler,
  FollowUpPayload,
  RegisteredCommand,
} from "./types";

const PING_COMMAND = "ping";

function getRegisteredCommand(commandName: string): RegisteredCommand | undefined {
  return COMMAND_HANDLERS.get(commandName);
}

async function runCommandGuards(
  env: Env,
  interaction: ChatInputCommandInteraction,
  registered: RegisteredCommand,
) {
  const guildResult = requireGuild(interaction, env.DISCORD_GUILD_ID);
  if (isErr(guildResult)) {
    return guildResult;
  }

  if (registered.requiresStaffRole) {
    const staffResult = requireStaffRole(interaction.member);
    if (isErr(staffResult)) {
      return staffResult;
    }
  } else if (registered.requiresScanzRole !== false) {
    const roleResult = requireScanzRole(interaction.member, env.SCANZ_ROLE_ID);
    if (isErr(roleResult)) {
      return roleResult;
    }
  }

  return guildResult;
}

export async function executeCommand(
  env: Env,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const commandName = interaction.data.name;

  await executeDeferredInteraction({
    applicationId: interaction.application_id,
    interactionToken: interaction.token,
    fallbackMessage:
      "Something went wrong while running that command. Please try again.",
    logLabel: "command",
    run: async (followUp) => {
      const registered = getRegisteredCommand(commandName);
      const handler = registered?.handler;
      const userId = getInteractionUserId(interaction);

      if (!handler || !registered) {
        await followUp(errorToMessage({ code: "UNKNOWN_COMMAND" }));
        return;
      }

      const guardResult = await runCommandGuards(env, interaction, registered);
      if (isErr(guardResult)) {
        await followUp(errorToMessage(guardResult.error));
        return;
      }

      if (commandName === PING_COMMAND && userId) {
        const memberRoles = interaction.member?.roles;
        if (!isCooldownExempt(memberRoles)) {
          const cooldownResult = await checkPingCooldown(env.COOLDOWN_KV, userId);
          if (isErr(cooldownResult)) {
            await followUp(errorToMessage(cooldownResult.error));
            return;
          }
        }
      }

      const api = createDiscordApiClient(env);
      const context: CommandContext = {
        env,
        interaction,
        api,
        followUp,
      };

      console.log("Command received", {
        command: commandName,
        userId,
        guildId: interaction.guild_id,
      });

      const result: Awaited<ReturnType<CommandHandler>> = await handler(context);
      if (!result.ok) {
        await followUp(errorToMessage(result.error));
        return;
      }

      if (commandName === PING_COMMAND && userId) {
        const memberRoles = interaction.member?.roles;
        if (!isCooldownExempt(memberRoles)) {
          await setPingCooldown(env.COOLDOWN_KV, userId);
        }
      }

      const payload: FollowUpPayload =
        typeof result.value === "string" ? { content: result.value } : result.value;

      await followUp(payload);

      if (payload.auditRunId) {
        await processAuditRunBatch(env, payload.auditRunId);
      }
    },
  });
}

export type { CommandHandler };
