import { getActivity, getAllActivityRoleIds } from "../../config/activities";
import type { AppError } from "../../errors";
import { requireActiveVoiceChannel } from "../../guards/voice";
import { buildAllowedRoleIdSet, sanitizeDescription } from "../../lib/sanitize";
import { parseStringOption } from "../../lib/options";
import { err, ok, type Result } from "../../lib/result";
import type { CommandContext } from "../types";
import { buildPingMessage, buildSuccessMessage } from "./format";

function getInteractionUserId(
  interaction: CommandContext["interaction"],
): string | undefined {
  return interaction.member?.user?.id ?? interaction.user?.id;
}

export async function handlePingCommand(
  context: CommandContext,
): Promise<Result<string, AppError>> {
  const { env, interaction, api } = context;
  const guildId = interaction.guild_id!;
  const userId = getInteractionUserId(interaction);

  if (!userId) {
    return err({ code: "MISSING_SCANZ_ROLE" });
  }

  const activityKey = parseStringOption(interaction, "activity");
  if (!activityKey) {
    return err({ code: "UNKNOWN_ACTIVITY" });
  }

  const activity = getActivity(activityKey);
  if (!activity) {
    return err({ code: "UNKNOWN_ACTIVITY" });
  }

  const voiceResult = await requireActiveVoiceChannel(api, guildId, userId);
  if (!voiceResult.ok) {
    return voiceResult;
  }

  const targetChannelId = activity.targetChannelId ?? env.DEFAULT_PING_CHANNEL_ID;
  const allowedRoleIds = buildAllowedRoleIdSet([
    ...getAllActivityRoleIds(),
    env.SCANZ_ROLE_ID,
  ]);

  const description = sanitizeDescription(
    parseStringOption(interaction, "description"),
    allowedRoleIds,
  );

  const content = buildPingMessage({
    roleId: activity.roleId,
    userId,
    voiceChannelId: voiceResult.value,
    activityLabel: activity.label,
    description,
  });

  try {
    await api.postMessage(targetChannelId, content, {
      roles: [activity.roleId],
      users: [userId],
      channels: [voiceResult.value],
    });
  } catch {
    return err({ code: "POST_FAILED" });
  }

  console.log("Ping command completed", {
    userId,
    guildId,
    activity: activityKey,
    voiceChannelId: voiceResult.value,
    targetChannelId,
  });

  return ok(buildSuccessMessage(activity.label));
}
