import type { Env } from "../env";
import type {
  AllowedMentions,
  DiscordChannel,
  DiscordGuild,
  DiscordMessage,
  DiscordVoiceState,
} from "./types";

const DISCORD_API_BASE = "https://discord.com/api/v10";

export class DiscordApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
    readonly operation: string,
  ) {
    super(message);
    this.name = "DiscordApiError";
  }
}

export class DiscordApiClient {
  constructor(private readonly env: Env) {}

  private headers(): HeadersInit {
    return {
      Authorization: `Bot ${this.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    };
  }

  private async request(
    operation: string,
    url: string,
    init?: RequestInit,
  ): Promise<Response> {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...this.headers(),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Discord API request failed", {
        operation,
        status: response.status,
        body,
      });
      throw new DiscordApiError(operation, response.status, body, operation);
    }

    return response;
  }

  async getUserVoiceChannelId(
    guildId: string,
    userId: string,
  ): Promise<string | null> {
    const singleUrl = `${DISCORD_API_BASE}/guilds/${guildId}/voice-states/${userId}`;
    const singleResponse = await fetch(singleUrl, { headers: this.headers() });

    if (singleResponse.status === 404) {
      return null;
    }

    if (singleResponse.ok) {
      const voiceState = (await singleResponse.json()) as DiscordVoiceState;
      return voiceState.channel_id ?? null;
    }

    const singleBody = await singleResponse.text();
    console.error("Voice state lookup failed", {
      guildId,
      userId,
      status: singleResponse.status,
      body: singleBody,
    });

    // Fallback: list all guild voice states (same permissions, but more resilient).
    if (singleResponse.status === 403) {
      return this.getUserVoiceChannelIdFromList(guildId, userId);
    }

    throw new DiscordApiError(
      "getUserVoiceChannelId",
      singleResponse.status,
      singleBody,
      "getUserVoiceChannelId",
    );
  }

  private async getUserVoiceChannelIdFromList(
    guildId: string,
    userId: string,
  ): Promise<string | null> {
    const listUrl = `${DISCORD_API_BASE}/guilds/${guildId}/voice-states`;
    const listResponse = await fetch(listUrl, { headers: this.headers() });

    if (!listResponse.ok) {
      const body = await listResponse.text();
      console.error("Voice state list lookup failed", {
        guildId,
        userId,
        status: listResponse.status,
        body,
      });
      throw new DiscordApiError(
        "getGuildVoiceStates",
        listResponse.status,
        body,
        "getGuildVoiceStates",
      );
    }

    const voiceStates = (await listResponse.json()) as Array<{
      user_id: string;
      channel_id: string | null;
    }>;

    const match = voiceStates.find((state) => state.user_id === userId);
    return match?.channel_id ?? null;
  }

  async getChannel(channelId: string): Promise<DiscordChannel> {
    const response = await this.request(
      "getChannel",
      `${DISCORD_API_BASE}/channels/${channelId}`,
    );

    return (await response.json()) as DiscordChannel;
  }

  async getGuild(guildId: string): Promise<DiscordGuild> {
    const response = await this.request(
      "getGuild",
      `${DISCORD_API_BASE}/guilds/${guildId}`,
    );

    return (await response.json()) as DiscordGuild;
  }

  async postMessage(
    channelId: string,
    content: string,
    allowedMentions: AllowedMentions,
  ): Promise<DiscordMessage> {
    const response = await this.request(
      "postMessage",
      `${DISCORD_API_BASE}/channels/${channelId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ content, allowed_mentions: allowedMentions }),
      },
    );

    return (await response.json()) as DiscordMessage;
  }

  async createPublicThreadFromMessage(
    channelId: string,
    messageId: string,
    name: string,
    autoArchiveDurationMinutes: number,
  ): Promise<DiscordChannel> {
    const response = await this.request(
      "createPublicThreadFromMessage",
      `${DISCORD_API_BASE}/channels/${channelId}/messages/${messageId}/threads`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          auto_archive_duration: autoArchiveDurationMinutes,
        }),
      },
    );

    return (await response.json()) as DiscordChannel;
  }

  async postSimpleMessage(
    channelId: string,
    content: string,
  ): Promise<DiscordMessage> {
    const response = await this.request(
      "postSimpleMessage",
      `${DISCORD_API_BASE}/channels/${channelId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content,
          allowed_mentions: { parse: [] },
        }),
      },
    );

    return (await response.json()) as DiscordMessage;
  }
}

export function createDiscordApiClient(env: Env): DiscordApiClient {
  return new DiscordApiClient(env);
}
