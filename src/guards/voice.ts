import type { DiscordApiClient } from "../discord/api";
import { ChannelType } from "../discord/types";
import type { AppError } from "../errors";
import { err, ok, type Result } from "../lib/result";

export async function requireActiveVoiceChannel(
  api: DiscordApiClient,
  guildId: string,
  userId: string,
): Promise<Result<string, AppError>> {
  let voiceChannelId: string | null;

  try {
    voiceChannelId = await api.getUserVoiceChannelId(guildId, userId);
  } catch {
    return err({ code: "VOICE_LOOKUP_FAILED" });
  }

  if (!voiceChannelId) {
    return err({ code: "NOT_IN_VOICE" });
  }

  try {
    const channel = await api.getChannel(voiceChannelId);
    if (channel.type === ChannelType.GUILD_STAGE_VOICE) {
      return err({ code: "INVALID_VOICE_CHANNEL" });
    }

    const guild = await api.getGuild(guildId);
    if (guild.afk_channel_id && guild.afk_channel_id === voiceChannelId) {
      return err({ code: "INVALID_VOICE_CHANNEL" });
    }
  } catch {
    return err({ code: "VOICE_LOOKUP_FAILED" });
  }

  return ok(voiceChannelId);
}
