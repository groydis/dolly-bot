export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
} as const;

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
} as const;

export const MessageFlags = {
  EPHEMERAL: 64,
} as const;

export const ChannelType = {
  GUILD_VOICE: 2,
  GUILD_STAGE_VOICE: 13,
} as const;

export interface ApplicationCommandOption {
  name: string;
  type: number;
  value?: string;
}

export interface GuildMember {
  user?: {
    id: string;
    username: string;
  };
  roles: string[];
}

export interface ChatInputCommandInteraction {
  id: string;
  application_id: string;
  type: typeof InteractionType.APPLICATION_COMMAND;
  token: string;
  guild_id?: string;
  user?: {
    id: string;
    username: string;
  };
  member?: GuildMember;
  data: {
    id: string;
    name: string;
    type: number;
    options?: ApplicationCommandOption[];
  };
}

export interface PingInteraction {
  type: typeof InteractionType.PING;
}

export type Interaction = PingInteraction | ChatInputCommandInteraction;

export interface InteractionResponse {
  type: number;
  data?: {
    content?: string;
    flags?: number;
    allowed_mentions?: AllowedMentions;
  };
}

export interface AllowedMentions {
  parse?: Array<"roles" | "users" | "everyone">;
  roles?: string[];
  users?: string[];
  channels?: string[];
}

export interface DiscordChannel {
  id: string;
  type: number;
}

export interface DiscordGuild {
  id: string;
  afk_channel_id: string | null;
}

export interface DiscordVoiceState {
  channel_id: string | null;
}

export interface CommandDefinition {
  name: string;
  description: string;
  type: 1;
  options?: Array<{
    name: string;
    description: string;
    type: number;
    required?: boolean;
    max_length?: number;
    choices?: Array<{ name: string; value: string }>;
  }>;
}
