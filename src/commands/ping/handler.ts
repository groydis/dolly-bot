import { getActivity, getAllActivityRoleIds } from "../../config/activities";
import { getInteractionUserId } from "../../discord/interaction-utils";
import type { AppError } from "../../errors";
import { requireActiveVoiceChannel } from "../../guards/voice";
import { buildAllowedRoleIdSet, sanitizeDescription } from "../../lib/sanitize";
import {
  parseStringOption,
  parseStringOptionAliases,
} from "../../lib/options";
import { err, ok, type Result } from "../../lib/result";
import type { CommandContext, FollowUpPayload } from "../types";
import { buildPingMessage, buildSuccessMessage } from "./format";
import { createPingDiscussionThread } from "./threads";

export async function handlePingCommand(
  context: CommandContext,
): Promise<Result<FollowUpPayload, AppError>> {
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

  const rawDescription = parseStringOptionAliases(interaction, [
    "description",
    "details",
  ]);

  const description = sanitizeDescription(rawDescription, allowedRoleIds);
  if (!description) {
    return err({ code: "MISSING_DESCRIPTION" });
  }

  const content = buildPingMessage({
    roleId: activity.roleId,
    userId,
    voiceChannelId: voiceResult.value,
    activityLabel: activity.label,
    description,
  });

  let pingMessageId: string;

  try {
    const pingMessage = await api.postMessage(targetChannelId, content, {
      roles: [activity.roleId],
      users: [userId],
      channels: [voiceResult.value],
    });
    pingMessageId = pingMessage.id;
  } catch {
    return err({ code: "POST_FAILED" });
  }

  try {
    await createPingDiscussionThread(
      api,
      targetChannelId,
      pingMessageId,
      activity.label,
    );
  } catch (error) {
    // Ping already posted — thread creation is best-effort.
    console.error("Failed to create ping discussion thread", {
      targetChannelId,
      pingMessageId,
      activity: activityKey,
      error,
    });
  }

  console.log("Ping command completed", {
    userId,
    guildId,
    activity: activityKey,
    voiceChannelId: voiceResult.value,
    targetChannelId,
  });

  return ok({ content: buildSuccessMessage(activity.label) });
}
