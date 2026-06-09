import type { Env } from "../env";
import type {
  AllowedMentions,
  DiscordChannel,
  DiscordGuild,
  DiscordVoiceState,
} from "./types";

const DISCORD_API_BASE = "https://discord.com/api/v10";

export class DiscordApiClient {
  constructor(private readonly env: Env) {}

  private headers(): HeadersInit {
    return {
      Authorization: `Bot ${this.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    };
  }

  async getUserVoiceChannelId(
    guildId: string,
    userId: string,
  ): Promise<string | null> {
    const response = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/voice-states/${userId}`,
      { headers: this.headers() },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text();
      console.error("Voice state lookup failed", {
        guildId,
        userId,
        status: response.status,
        body,
      });
      throw new Error("VOICE_LOOKUP_FAILED");
    }

    const voiceState = (await response.json()) as DiscordVoiceState;
    return voiceState.channel_id ?? null;
  }

  async getChannel(channelId: string): Promise<DiscordChannel> {
    const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}`, {
      headers: this.headers(),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Channel lookup failed", {
        channelId,
        status: response.status,
        body,
      });
      throw new Error("VOICE_LOOKUP_FAILED");
    }

    return (await response.json()) as DiscordChannel;
  }

  async getGuild(guildId: string): Promise<DiscordGuild> {
    const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}`, {
      headers: this.headers(),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Guild lookup failed", {
        guildId,
        status: response.status,
        body,
      });
      throw new Error("VOICE_LOOKUP_FAILED");
    }

    return (await response.json()) as DiscordGuild;
  }

  async postMessage(
    channelId: string,
    content: string,
    allowedMentions: AllowedMentions,
  ): Promise<void> {
    const response = await fetch(
      `${DISCORD_API_BASE}/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ content, allowed_mentions: allowedMentions }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error("Failed to post activity ping", {
        channelId,
        status: response.status,
        body,
      });
      throw new Error("POST_FAILED");
    }
  }
}

export function createDiscordApiClient(env: Env): DiscordApiClient {
  return new DiscordApiClient(env);
}
