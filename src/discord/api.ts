import type { Env } from "../env";
import { DISCORD_API_BASE } from "./constants";
import type {
  AllowedMentions,
  CreateGuildChannelPayload,
  CreateGuildRolePayload,
  ModifyGuildChannelPayload,
  DiscordChannel,
  DiscordGuild,
  DiscordGuildMember,
  DiscordMessage,
  DiscordRole,
  DiscordVoiceState,
} from "./types";

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
    context?: Record<string, unknown>,
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
        ...context,
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

  async postMessageWithFile(
    channelId: string,
    content: string,
    file: { filename: string; body: string; contentType?: string },
  ): Promise<DiscordMessage> {
    const formData = new FormData();
    formData.append(
      "payload_json",
      JSON.stringify({
        content,
        allowed_mentions: { parse: [] },
      }),
    );
    formData.append(
      "files[0]",
      new Blob([file.body], { type: file.contentType ?? "text/csv" }),
      file.filename,
    );

    const response = await fetch(
      `${DISCORD_API_BASE}/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${this.env.DISCORD_BOT_TOKEN}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error("Discord API request failed", {
        operation: "postMessageWithFile",
        status: response.status,
        body,
        channelId,
        filename: file.filename,
      });
      throw new DiscordApiError(
        "postMessageWithFile",
        response.status,
        body,
        "postMessageWithFile",
      );
    }

    return (await response.json()) as DiscordMessage;
  }

  async addMemberRole(
    guildId: string,
    userId: string,
    roleId: string,
  ): Promise<void> {
    console.log("Discord addMemberRole", { guildId, userId, roleId });
    await this.request(
      "addMemberRole",
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      { method: "PUT" },
      { guildId, userId, roleId },
    );
  }

  async removeMemberRole(
    guildId: string,
    userId: string,
    roleId: string,
  ): Promise<void> {
    console.log("Discord removeMemberRole", { guildId, userId, roleId });
    await this.request(
      "removeMemberRole",
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      { method: "DELETE" },
      { guildId, userId, roleId },
    );
  }

  async setMemberNickname(
    guildId: string,
    userId: string,
    nick: string,
  ): Promise<void> {
    console.log("Discord setMemberNickname", { guildId, userId, nick });
    await this.request(
      "setMemberNickname",
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ nick }),
      },
      { guildId, userId, nick },
    );
  }

  async getGuildMember(
    guildId: string,
    userId: string,
  ): Promise<DiscordGuildMember> {
    const response = await this.request(
      "getGuildMember",
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
    );

    return (await response.json()) as DiscordGuildMember;
  }

  async listGuildMembers(
    guildId: string,
    after?: string,
  ): Promise<DiscordGuildMember[]> {
    const params = new URLSearchParams({ limit: "1000" });
    if (after) {
      params.set("after", after);
    }

    const response = await this.request(
      "listGuildMembers",
      `${DISCORD_API_BASE}/guilds/${guildId}/members?${params.toString()}`,
    );

    return (await response.json()) as DiscordGuildMember[];
  }

  async listGuildRoles(guildId: string): Promise<DiscordRole[]> {
    const response = await this.request(
      "listGuildRoles",
      `${DISCORD_API_BASE}/guilds/${guildId}/roles`,
    );

    return (await response.json()) as DiscordRole[];
  }

  async createGuildRole(
    guildId: string,
    payload: CreateGuildRolePayload,
  ): Promise<DiscordRole> {
    const response = await this.request(
      "createGuildRole",
      `${DISCORD_API_BASE}/guilds/${guildId}/roles`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    return (await response.json()) as DiscordRole;
  }

  async listGuildChannels(guildId: string): Promise<DiscordChannel[]> {
    const response = await this.request(
      "listGuildChannels",
      `${DISCORD_API_BASE}/guilds/${guildId}/channels`,
    );

    return (await response.json()) as DiscordChannel[];
  }

  async createGuildChannel(
    guildId: string,
    payload: CreateGuildChannelPayload,
  ): Promise<DiscordChannel> {
    const response = await this.request(
      "createGuildChannel",
      `${DISCORD_API_BASE}/guilds/${guildId}/channels`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    return (await response.json()) as DiscordChannel;
  }

  async modifyGuildChannel(
    channelId: string,
    payload: ModifyGuildChannelPayload,
  ): Promise<DiscordChannel> {
    const response = await this.request(
      "modifyGuildChannel",
      `${DISCORD_API_BASE}/channels/${channelId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      { channelId, ...payload },
    );

    return (await response.json()) as DiscordChannel;
  }
}

export function createDiscordApiClient(env: Env): DiscordApiClient {
  return new DiscordApiClient(env);
}
