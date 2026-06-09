import { describe, expect, it, vi } from "vitest";
import { ChannelType } from "../../src/discord/types";
import { processVerifyConfirm } from "../../src/commands/verify/confirm";
import { HttpStatus } from "../../src/lib/http-status";
import { createMemoryD1 } from "../helpers/memory-d1";
import { createMemoryKv } from "../helpers/memory-kv";
import {
  mockEnvWithStorage,
  TEST_AUDIT_CHANNEL_ID,
  TEST_GUILD_ID,
  TEST_PARTNER_CATEGORY_ID,
  TEST_ROLE_IDS,
} from "../helpers/mock-env";
import { createMockDiscordApi } from "../helpers/mock-discord-api";
import { createMockRsiClient } from "../helpers/mock-rsi-client";
import {
  seedVerifySession,
  sessionStorageKey,
} from "../helpers/verify-session";

const USER_ID = "discord-user-1";
const SESSION_ID = "session-abc";

function setupEnv() {
  const kv = createMemoryKv();
  const db = createMemoryD1();
  const env = mockEnvWithStorage({ kv, db });
  return { kv, db, env };
}

describe("processVerifyConfirm session guards", () => {
  it("returns VERIFY_SESSION_NOT_FOUND when session is missing", async () => {
    const { env } = setupEnv();
    const api = createMockDiscordApi();

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [],
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VERIFY_SESSION_NOT_FOUND");
    }
  });

  it("returns VERIFY_SESSION_EXPIRED when session is past expiry", async () => {
    const { kv, env } = setupEnv();
    await seedVerifySession(kv, {
      sessionId: SESSION_ID,
      discordUserId: USER_ID,
      handle: "Test_Pilot",
      orgSid: "SCANZ",
      code: "ABC123",
      expiresAt: Date.now() - 60_000,
    });
    const api = createMockDiscordApi();

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [],
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VERIFY_SESSION_EXPIRED");
    }
  });

  it("returns VERIFY_WRONG_USER when discord user does not own session", async () => {
    const { kv, env } = setupEnv();
    await seedVerifySession(kv, {
      sessionId: SESSION_ID,
      discordUserId: USER_ID,
      handle: "Test_Pilot",
      orgSid: "SCANZ",
      code: "ABC123",
    });
    const api = createMockDiscordApi();

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      "other-user",
      [],
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VERIFY_WRONG_USER");
    }
  });
});

describe("processVerifyConfirm SCANZ path", () => {
  async function seedScanzSession(
    kv: KVNamespace,
    overrides: { code?: string; handle?: string } = {},
  ) {
    return seedVerifySession(kv, {
      sessionId: SESSION_ID,
      discordUserId: USER_ID,
      handle: overrides.handle ?? "Test_Pilot",
      orgSid: "SCANZ",
      code: overrides.code ?? "ABC123",
    });
  }

  it("completes scanz verification and persists record", async () => {
    const { kv, db, env } = setupEnv();
    await seedScanzSession(kv);
    const api = createMockDiscordApi();
    const rsiClient = createMockRsiClient({
      citizenFixture: "citizen-scanz-main.html",
      orgFixture: "org-members-found.json",
    });

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [],
      { rsiClient },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("Verified!");
      expect(result.value).toContain("Test_Pilot");
    }

    expect(api.addMemberRole).toHaveBeenCalledWith(
      TEST_GUILD_ID,
      USER_ID,
      TEST_ROLE_IDS.scanz,
    );
    expect(api.addMemberRole).toHaveBeenCalledWith(
      TEST_GUILD_ID,
      USER_ID,
      TEST_ROLE_IDS.verified,
    );
    expect(api.setMemberNickname).toHaveBeenCalledWith(
      TEST_GUILD_ID,
      USER_ID,
      "Test_Pilot",
    );

    const record = db.records.get(USER_ID);
    expect(record).toMatchObject({
      rsiHandle: "Test_Pilot",
      verifyPath: "scanz",
      orgSid: "SCANZ",
      grantedRoles: ["scanz", "verified"],
    });
    expect(kv.store.has(sessionStorageKey(SESSION_ID))).toBe(false);
  });

  it("returns VERIFY_CODE_NOT_IN_BIO when bio code does not match", async () => {
    const { kv, env } = setupEnv();
    await seedScanzSession(kv, { code: "WRONG1" });
    const api = createMockDiscordApi();
    const rsiClient = createMockRsiClient({
      citizenFixture: "citizen-scanz-main.html",
    });

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [],
      { rsiClient },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VERIFY_CODE_NOT_IN_BIO");
    }
  });

  it("returns RSI_HANDLE_NOT_FOUND on citizen 404", async () => {
    const { kv, env } = setupEnv();
    await seedScanzSession(kv);
    const api = createMockDiscordApi();
    const rsiClient = createMockRsiClient({
      citizenStatus: HttpStatus.NOT_FOUND,
    });

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [],
      { rsiClient },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("RSI_HANDLE_NOT_FOUND");
    }
  });

  it("returns RSI_FETCH_FAILED when citizen fetch throws", async () => {
    const { kv, env } = setupEnv();
    await seedScanzSession(kv);
    const api = createMockDiscordApi();
    const rsiClient = createMockRsiClient({ citizenThrows: true });

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [],
      { rsiClient },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("RSI_FETCH_FAILED");
    }
  });

  it("returns RSI_FETCH_FAILED when citizen returns non-OK status", async () => {
    const { kv, env } = setupEnv();
    await seedScanzSession(kv);
    const api = createMockDiscordApi();
    const rsiClient = createMockRsiClient({
      citizenStatus: 500,
      citizenFixture: "citizen-scanz-main.html",
    });

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [],
      { rsiClient },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("RSI_FETCH_FAILED");
    }
  });

  it("returns VERIFY_HANDLE_MISMATCH when parsed handle differs", async () => {
    const { kv, env } = setupEnv();
    await seedScanzSession(kv, { handle: "Wrong_Handle" });
    const api = createMockDiscordApi();
    const rsiClient = createMockRsiClient({
      citizenFixture: "citizen-scanz-main.html",
    });

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [],
      { rsiClient },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VERIFY_HANDLE_MISMATCH");
    }
  });

  it("returns VERIFY_DISCORD_UPDATE_FAILED when nickname update throws", async () => {
    const { kv, env } = setupEnv();
    await seedScanzSession(kv);
    const api = createMockDiscordApi({
      setMemberNickname: vi.fn().mockRejectedValue(new Error("forbidden")),
    });
    const rsiClient = createMockRsiClient({
      citizenFixture: "citizen-scanz-main.html",
      orgFixture: "org-members-found.json",
    });

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [],
      { rsiClient },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VERIFY_DISCORD_UPDATE_FAILED");
    }
    expect(api.addMemberRole).toHaveBeenCalled();
  });

  it("posts role review alert when affiliate-only but member still has @SCANZ", async () => {
    const { kv, db, env } = setupEnv();
    await seedScanzSession(kv, {
      handle: "Affiliate_User",
      code: "AFF123",
    });
    const api = createMockDiscordApi();
    const rsiClient = createMockRsiClient({
      citizenFixture: "citizen-affiliate.html",
      orgFound: false,
      bioCode: { orgSid: "SCANZ", code: "AFF123" },
    });

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [TEST_ROLE_IDS.scanz],
      { rsiClient },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("affiliate");
    }

    expect(api.postSimpleMessage).toHaveBeenCalledWith(
      TEST_AUDIT_CHANNEL_ID,
      expect.stringContaining("Verify review needed"),
    );

    const record = db.records.get(USER_ID);
    expect(record?.grantedRoles).toEqual(["affiliate"]);
  });
});

describe("processVerifyConfirm partner path", () => {
  it("completes affiliate-only partner verification without provisioning", async () => {
    const { kv, db, env } = setupEnv();
    await seedVerifySession(kv, {
      sessionId: SESSION_ID,
      discordUserId: USER_ID,
      handle: "Affiliate_User",
      orgSid: "ZAP",
      code: "PART01",
    });
    const api = createMockDiscordApi();
    const rsiClient = createMockRsiClient({
      citizenFixture: "citizen-affiliate.html",
      orgFound: false,
      bioCode: { orgSid: "ZAP", code: "PART01" },
    });

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [],
      { rsiClient },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("ZAP");
      expect(result.value).toContain("affiliate");
    }

    expect(api.createGuildChannel).not.toHaveBeenCalled();
    expect(api.createGuildRole).not.toHaveBeenCalled();
    expect(api.addMemberRole).toHaveBeenCalledWith(
      TEST_GUILD_ID,
      USER_ID,
      TEST_ROLE_IDS.affiliate,
    );

    const record = db.records.get(USER_ID);
    expect(record).toMatchObject({
      rsiHandle: "Affiliate_User",
      verifyPath: "partner",
      orgSid: "ZAP",
      grantedRoles: ["affiliate"],
      partnerOrgRoleId: null,
    });
  });

  it("completes full partner verification with org provisioning", async () => {
    const kv = createMemoryKv();
    const db = createMemoryD1();
    const env = mockEnvWithStorage({
      kv,
      db,
      env: { DISCORD_APPLICATION_ID: "app-bot-1" },
    });
    await seedVerifySession(kv, {
      sessionId: SESSION_ID,
      discordUserId: USER_ID,
      handle: "Affiliate_User",
      orgSid: "ZAP",
      code: "PART01",
    });

    const channelId = "channel-zap-1";
    const api = createMockDiscordApi({
      listGuildRoles: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValue([{ id: TEST_ROLE_IDS.orgZap, name: "org_zap" }]),
      createGuildRole: vi.fn().mockResolvedValue({
        id: TEST_ROLE_IDS.orgZap,
        name: "org_zap",
      }),
      listGuildChannels: vi.fn().mockResolvedValue([]),
      createGuildChannel: vi.fn().mockResolvedValue({
        id: channelId,
        type: ChannelType.GUILD_TEXT,
        name: "zap",
      }),
    });

    const rsiClient = createMockRsiClient({
      citizenFixture: "citizen-affiliate.html",
      orgBody: JSON.stringify({
        success: 1,
        data: {
          totalrows: 1,
          html: '<a href="/citizens/Affiliate_User">Affiliate_User</a>',
        },
      }),
      bioCode: { orgSid: "ZAP", code: "PART01" },
    });

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [],
      { rsiClient },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("ZAP");
      expect(result.value).toContain("#zap");
    }

    expect(api.createGuildRole).toHaveBeenCalled();
    expect(api.createGuildChannel).toHaveBeenCalled();
    expect(api.addMemberRole).toHaveBeenCalledWith(
      TEST_GUILD_ID,
      USER_ID,
      TEST_ROLE_IDS.affiliate,
    );
    expect(api.addMemberRole).toHaveBeenCalledWith(
      TEST_GUILD_ID,
      USER_ID,
      TEST_ROLE_IDS.verified,
    );
    expect(api.addMemberRole).toHaveBeenCalledWith(
      TEST_GUILD_ID,
      USER_ID,
      TEST_ROLE_IDS.orgZap,
    );

    const record = db.records.get(USER_ID);
    expect(record).toMatchObject({
      rsiHandle: "Affiliate_User",
      verifyPath: "partner",
      orgSid: "ZAP",
      grantedRoles: ["affiliate", "verified", "partner_org"],
      partnerOrgRoleId: TEST_ROLE_IDS.orgZap,
    });
  });

  it("provisions org channel when verify org is main org but roster API misses", async () => {
    const kv = createMemoryKv();
    const db = createMemoryD1();
    const env = mockEnvWithStorage({
      kv,
      db,
      env: { DISCORD_APPLICATION_ID: "app-bot-1" },
    });
    await seedVerifySession(kv, {
      sessionId: SESSION_ID,
      discordUserId: USER_ID,
      handle: "Founder_User",
      orgSid: "NEWORG",
      code: "NEW001",
    });

    const channelId = "channel-neworg-1";
    const orgRoleId = "5555555555555555555";
    const api = createMockDiscordApi({
      listGuildRoles: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValue([{ id: orgRoleId, name: "org_neworg" }]),
      createGuildRole: vi.fn().mockResolvedValue({
        id: orgRoleId,
        name: "org_neworg",
      }),
      listGuildChannels: vi.fn().mockResolvedValue([]),
      createGuildChannel: vi.fn().mockResolvedValue({
        id: channelId,
        type: ChannelType.GUILD_TEXT,
        name: "neworg",
      }),
      getChannel: vi.fn().mockResolvedValue({
        id: channelId,
        type: ChannelType.GUILD_TEXT,
        parent_id: TEST_PARTNER_CATEGORY_ID,
      }),
    });

    const rsiClient = createMockRsiClient({
      citizenHtml:
        '<span class="label">Handle name</span><strong class="value">Founder_User</strong>\n' +
        'Spectrum Identification (SID)<strong class="value">NEWORG</strong>\n' +
        '<div class="entry bio"><div class="value">[NEWORG: NEW001]</div></div>',
      orgFound: false,
    });

    const result = await processVerifyConfirm(
      env,
      api,
      SESSION_ID,
      USER_ID,
      [],
      { rsiClient },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("#neworg");
    }

    expect(api.createGuildChannel).toHaveBeenCalled();
    expect(api.addMemberRole).toHaveBeenCalledWith(
      TEST_GUILD_ID,
      USER_ID,
      orgRoleId,
    );
  });
});
