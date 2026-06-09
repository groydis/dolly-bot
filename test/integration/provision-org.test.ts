import { describe, expect, it, vi } from "vitest";
import {
  ensurePartnerOrgChannel,
  ensurePartnerOrgRole,
  provisionPartnerOrg,
} from "../../src/commands/verify/provision-org";
import { ChannelType } from "../../src/discord/types";
import { createMemoryKv } from "../helpers/memory-kv";
import {
  mockEnv,
  TEST_GUILD_ID,
  TEST_PARTNER_CATEGORY_ID,
  TEST_ROLE_IDS,
} from "../helpers/mock-env";
import { createMockDiscordApi } from "../helpers/mock-discord-api";

const ORG_SID = "ZAP";
const APP_ID = "app-bot-1";
const CHANNEL_ID = "channel-zap-1";

function setupEnv() {
  const kv = createMemoryKv();
  return mockEnv({
    VERIFY_KV: kv,
    DISCORD_APPLICATION_ID: APP_ID,
  });
}

describe("ensurePartnerOrgRole", () => {
  it("returns cached role id without listing guild roles", async () => {
    const env = setupEnv();
    await env.VERIFY_KV.put("org_role:ZAP", TEST_ROLE_IDS.orgZap);
    const api = createMockDiscordApi();

    const roleId = await ensurePartnerOrgRole(
      api,
      env,
      TEST_GUILD_ID,
      ORG_SID,
    );

    expect(roleId).toBe(TEST_ROLE_IDS.orgZap);
    expect(api.listGuildRoles).not.toHaveBeenCalled();
  });

  it("creates org role when missing and caches it", async () => {
    const env = setupEnv();
    const api = createMockDiscordApi({
      listGuildRoles: vi.fn().mockResolvedValue([]),
      createGuildRole: vi.fn().mockResolvedValue({
        id: TEST_ROLE_IDS.orgZap,
        name: "org_zap",
      }),
    });

    const roleId = await ensurePartnerOrgRole(
      api,
      env,
      TEST_GUILD_ID,
      ORG_SID,
    );

    expect(roleId).toBe(TEST_ROLE_IDS.orgZap);
    expect(api.createGuildRole).toHaveBeenCalledWith(TEST_GUILD_ID, {
      name: "org_zap",
      mentionable: true,
    });
    expect(await env.VERIFY_KV.get("org_role:ZAP")).toBe(TEST_ROLE_IDS.orgZap);
  });

  it("reuses existing guild role and caches it", async () => {
    const env = setupEnv();
    const api = createMockDiscordApi({
      listGuildRoles: vi.fn().mockResolvedValue([
        { id: TEST_ROLE_IDS.orgZap, name: "org_zap" },
      ]),
    });

    const roleId = await ensurePartnerOrgRole(
      api,
      env,
      TEST_GUILD_ID,
      ORG_SID,
    );

    expect(roleId).toBe(TEST_ROLE_IDS.orgZap);
    expect(api.createGuildRole).not.toHaveBeenCalled();
    expect(await env.VERIFY_KV.get("org_role:ZAP")).toBe(TEST_ROLE_IDS.orgZap);
  });
});

describe("ensurePartnerOrgChannel", () => {
  it("returns cached channel without listing guild channels", async () => {
    const env = setupEnv();
    await env.VERIFY_KV.put("org_channel:ZAP", CHANNEL_ID);
    const api = createMockDiscordApi({
      getChannel: vi.fn().mockResolvedValue({
        id: CHANNEL_ID,
        type: ChannelType.GUILD_TEXT,
        parent_id: TEST_PARTNER_CATEGORY_ID,
      }),
    });

    const result = await ensurePartnerOrgChannel(
      api,
      env,
      TEST_GUILD_ID,
      ORG_SID,
      TEST_ROLE_IDS.orgZap,
    );

    expect(result).toEqual({
      channelId: CHANNEL_ID,
      channelName: "zap",
      created: false,
    });
    expect(api.listGuildChannels).not.toHaveBeenCalled();
  });

  it("creates text channel with overwrites and caches it", async () => {
    const env = setupEnv();
    const api = createMockDiscordApi({
      listGuildChannels: vi.fn().mockResolvedValue([]),
      createGuildChannel: vi.fn().mockResolvedValue({
        id: CHANNEL_ID,
        type: ChannelType.GUILD_TEXT,
        name: "zap",
      }),
    });

    const result = await ensurePartnerOrgChannel(
      api,
      env,
      TEST_GUILD_ID,
      ORG_SID,
      TEST_ROLE_IDS.orgZap,
    );

    expect(result.created).toBe(true);
    expect(result.channelId).toBe(CHANNEL_ID);
    expect(api.createGuildChannel).toHaveBeenCalledWith(
      TEST_GUILD_ID,
      expect.objectContaining({
        name: "zap",
        type: ChannelType.GUILD_TEXT,
        parent_id: TEST_PARTNER_CATEGORY_ID,
      }),
    );
    expect(await env.VERIFY_KV.get("org_channel:ZAP")).toBe(CHANNEL_ID);
  });

  it("creates channel when org role already exists in guild", async () => {
    const env = setupEnv();
    const api = createMockDiscordApi({
      listGuildRoles: vi.fn().mockResolvedValue([
        { id: TEST_ROLE_IDS.orgZap, name: "org_zap" },
      ]),
      listGuildChannels: vi.fn().mockResolvedValue([]),
      createGuildChannel: vi.fn().mockResolvedValue({
        id: CHANNEL_ID,
        type: ChannelType.GUILD_TEXT,
        name: "zap",
      }),
      getChannel: vi.fn().mockResolvedValue({
        id: CHANNEL_ID,
        type: ChannelType.GUILD_TEXT,
        parent_id: TEST_PARTNER_CATEGORY_ID,
      }),
    });

    const result = await ensurePartnerOrgChannel(
      api,
      env,
      TEST_GUILD_ID,
      ORG_SID,
      TEST_ROLE_IDS.orgZap,
    );

    expect(result.created).toBe(true);
    expect(api.createGuildRole).not.toHaveBeenCalled();
    expect(api.createGuildChannel).toHaveBeenCalled();
  });

  it("recreates channel when cached channel id is stale", async () => {
    const env = setupEnv();
    await env.VERIFY_KV.put("org_channel:ZAP", "deleted-channel");
    const api = createMockDiscordApi({
      getChannel: vi
        .fn()
        .mockRejectedValueOnce(new Error("Unknown Channel"))
        .mockResolvedValue({
          id: CHANNEL_ID,
          type: ChannelType.GUILD_TEXT,
          parent_id: TEST_PARTNER_CATEGORY_ID,
        }),
      listGuildChannels: vi.fn().mockResolvedValue([]),
      createGuildChannel: vi.fn().mockResolvedValue({
        id: CHANNEL_ID,
        type: ChannelType.GUILD_TEXT,
        name: "zap",
      }),
    });

    const result = await ensurePartnerOrgChannel(
      api,
      env,
      TEST_GUILD_ID,
      ORG_SID,
      TEST_ROLE_IDS.orgZap,
    );

    expect(result.created).toBe(true);
    expect(api.createGuildChannel).toHaveBeenCalled();
    expect(await env.VERIFY_KV.get("org_channel:ZAP")).toBe(CHANNEL_ID);
  });
});

describe("provisionPartnerOrg", () => {
  it("provisions role and channel for a fresh org", async () => {
    const env = setupEnv();
    const api = createMockDiscordApi({
      listGuildRoles: vi.fn().mockResolvedValue([]),
      createGuildRole: vi.fn().mockResolvedValue({
        id: TEST_ROLE_IDS.orgZap,
        name: "org_zap",
      }),
      listGuildChannels: vi.fn().mockResolvedValue([]),
      createGuildChannel: vi.fn().mockResolvedValue({
        id: CHANNEL_ID,
        type: ChannelType.GUILD_TEXT,
        name: "zap",
      }),
    });

    const result = await provisionPartnerOrg(
      api,
      env,
      TEST_GUILD_ID,
      ORG_SID,
    );

    expect(result).toEqual({
      orgRoleId: TEST_ROLE_IDS.orgZap,
      channelName: "zap",
      channelCreated: true,
    });
    expect(api.postSimpleMessage).toHaveBeenCalledWith(
      CHANNEL_ID,
      expect.stringContaining("ZAP"),
    );
  });
});
