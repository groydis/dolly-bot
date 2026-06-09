import { DiscordApiError, type DiscordApiClient } from "../discord/api";
import { ChannelType } from "../discord/types";
import type { AppError } from "../errors";
import { err, ok, type Result } from "../lib/result";

function mapVoiceLookupError(error: unknown): AppError {
  if (error instanceof DiscordApiError) {
    if (error.status === 403) {
      return { code: "VOICE_CHANNEL_ACCESS_DENIED" };
    }
  }

  return { code: "VOICE_LOOKUP_FAILED" };
}

export async function requireActiveVoiceChannel(
  api: DiscordApiClient,
  guildId: string,
  userId: string,
): Promise<Result<string, AppError>> {
  let voiceChannelId: string | null;

  try {
    voiceChannelId = await api.getUserVoiceChannelId(guildId, userId);
  } catch (error) {
    console.error("Voice state resolution failed", { guildId, userId, error });
    return err(mapVoiceLookupError(error));
  }

  if (!voiceChannelId) {
    return err({ code: "NOT_IN_VOICE" });
  }

  try {
    const guild = await api.getGuild(guildId);
    if (guild.afk_channel_id && guild.afk_channel_id === voiceChannelId) {
      return err({ code: "INVALID_VOICE_CHANNEL" });
    }

    const channel = await api.getChannel(voiceChannelId);
    if (channel.type === ChannelType.GUILD_STAGE_VOICE) {
      return err({ code: "INVALID_VOICE_CHANNEL" });
    }
  } catch (error) {
    console.error("Voice channel validation failed", {
      guildId,
      userId,
      voiceChannelId,
      error,
    });
    return err(mapVoiceLookupError(error));
  }

  return ok(voiceChannelId);
}
