export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  MODAL_SUBMIT: 5,
} as const;

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  MODAL: 9,
} as const;

export const MessageFlags = {
  EPHEMERAL: 64,
} as const;

export const ApplicationCommandType = {
  CHAT_INPUT: 1,
} as const;

export const ApplicationCommandOptionType = {
  STRING: 3,
  USER: 6,
} as const;

export const ChannelType = {
  GUILD_TEXT: 0,
  GUILD_VOICE: 2,
  GUILD_STAGE_VOICE: 13,
} as const;

export const PermissionOverwriteType = {
  ROLE: 0,
  MEMBER: 1,
} as const;

/** Discord permission bit strings as used in channel permission_overwrites API. */
export const PermissionFlags = {
  /** Deny @everyone from viewing the channel. */
  VIEW_CHANNEL: "1024",
  /** Allow role/member to view channel, read history, and send messages. */
  VIEW_CHANNEL_AND_HISTORY: "68608",
} as const;

export const ComponentType = {
  ACTION_ROW: 1,
  BUTTON: 2,
  TEXT_INPUT: 4,
} as const;

export const ButtonStyle = {
  PRIMARY: 1,
  SECONDARY: 2,
} as const;

export const TextInputStyle = {
  SHORT: 1,
} as const;

export interface ApplicationCommandOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: ApplicationCommandOption[];
}

export interface GuildMember {
  user?: {
    id: string;
    username: string;
  };
  nick?: string | null;
  roles: string[];
}

export interface DiscordGuildMember {
  user: {
    id: string;
    username: string;
  };
  nick?: string | null;
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

export interface ComponentInteraction {
  id: string;
  application_id: string;
  type: typeof InteractionType.MESSAGE_COMPONENT;
  token: string;
  guild_id?: string;
  user?: {
    id: string;
    username: string;
  };
  member?: GuildMember;
  data: {
    custom_id: string;
    component_type: number;
  };
}

export interface ModalTextInputComponent {
  type: typeof ComponentType.TEXT_INPUT;
  custom_id: string;
  value: string;
}

export interface ModalActionRow {
  type: typeof ComponentType.ACTION_ROW;
  components: ModalTextInputComponent[];
}

export interface ModalSubmitInteraction {
  id: string;
  application_id: string;
  type: typeof InteractionType.MODAL_SUBMIT;
  token: string;
  guild_id?: string;
  user?: {
    id: string;
    username: string;
  };
  member?: GuildMember;
  data: {
    custom_id: string;
    components: ModalActionRow[];
  };
}

export interface MessageComponentButton {
  type: typeof ComponentType.BUTTON;
  style: number;
  label: string;
  custom_id: string;
}

export interface TextInputComponent {
  type: typeof ComponentType.TEXT_INPUT;
  custom_id: string;
  label: string;
  style: number;
  min_length?: number;
  max_length?: number;
  placeholder?: string;
  required?: boolean;
}

export interface ActionRow {
  type: typeof ComponentType.ACTION_ROW;
  components: MessageComponentButton[];
}

export interface ModalActionRowDefinition {
  type: typeof ComponentType.ACTION_ROW;
  components: TextInputComponent[];
}

export interface Embed {
  title?: string;
  description?: string;
  color?: number;
}

export interface ChannelMessagePayload {
  content?: string;
  embeds?: Embed[];
  components?: ActionRow[];
  allowed_mentions?: AllowedMentions;
}

export interface PingInteraction {
  type: typeof InteractionType.PING;
}

export type Interaction =
  | PingInteraction
  | ChatInputCommandInteraction
  | ComponentInteraction
  | ModalSubmitInteraction;

export interface InteractionResponse {
  type: number;
  data?: {
    content?: string;
    flags?: number;
    allowed_mentions?: AllowedMentions;
    components?: ActionRow[] | ModalActionRowDefinition[];
    custom_id?: string;
    title?: string;
    embeds?: Embed[];
  };
}

export interface AllowedMentions {
  parse?: Array<"roles" | "users" | "everyone">;
  roles?: string[];
  users?: string[];
  channels?: string[];
}

export interface PermissionOverwrite {
  id: string;
  type: 0 | 1;
  allow?: string;
  deny?: string;
}

export interface DiscordChannel {
  id: string;
  type: number;
  name?: string;
  parent_id?: string | null;
  permission_overwrites?: PermissionOverwrite[];
}

export interface DiscordRole {
  id: string;
  name: string;
}

export interface CreateGuildRolePayload {
  name: string;
  mentionable?: boolean;
}

export interface CreateGuildChannelPayload {
  name: string;
  type: number;
  parent_id?: string;
  permission_overwrites?: PermissionOverwrite[];
}

export interface ModifyGuildChannelPayload {
  parent_id?: string | null;
}

export interface DiscordMessage {
  id: string;
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
