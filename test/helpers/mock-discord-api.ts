import { vi } from "vitest";
import type { DiscordApi } from "../../src/discord/api";
import type { DiscordGuildMember, DiscordMessage } from "../../src/discord/types";
import { ChannelType } from "../../src/discord/types";

const defaultMessage: DiscordMessage = {
  id: "msg-1",
};

const defaultMember: DiscordGuildMember = {
  user: { id: "user-1", username: "test_user" },
  roles: [],
  nick: null,
};

export type MockDiscordApi = DiscordApi & {
  getGuildMember: ReturnType<typeof vi.fn>;
  addMemberRole: ReturnType<typeof vi.fn>;
  setMemberNickname: ReturnType<typeof vi.fn>;
  postSimpleMessage: ReturnType<typeof vi.fn>;
};

export function createMockDiscordApi(
  overrides: Partial<DiscordApi> = {},
): MockDiscordApi {
  const api = {
    getUserVoiceChannelId: vi.fn().mockResolvedValue(null),
    getChannel: vi.fn().mockImplementation(async (channelId: string) => ({
      id: channelId,
      type: ChannelType.GUILD_TEXT,
      parent_id: "cat-1",
    })),
    getGuild: vi.fn(),
    postMessage: vi.fn().mockResolvedValue(defaultMessage),
    createPublicThreadFromMessage: vi.fn(),
    postSimpleMessage: vi.fn().mockResolvedValue(defaultMessage),
    postChannelMessage: vi.fn().mockResolvedValue(defaultMessage),
    postMessageWithFile: vi.fn().mockResolvedValue(defaultMessage),
    addMemberRole: vi.fn().mockResolvedValue(undefined),
    removeMemberRole: vi.fn().mockResolvedValue(undefined),
    setMemberNickname: vi.fn().mockResolvedValue(undefined),
    getGuildMember: vi.fn().mockResolvedValue(defaultMember),
    listGuildMembers: vi.fn().mockResolvedValue([]),
    listGuildRoles: vi.fn().mockResolvedValue([]),
    createGuildRole: vi.fn(),
    listGuildChannels: vi.fn().mockResolvedValue([]),
    createGuildChannel: vi.fn(),
    modifyGuildChannel: vi.fn(),
    ...overrides,
  };

  return api as MockDiscordApi;
}
