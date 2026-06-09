import { describe, expect, it } from "vitest";
import { checkMemberAudit } from "../../src/audit/check-member";
import type { VerifyRecord } from "../../src/db/verify-records";
import { HttpStatus } from "../../src/lib/http-status";
import { createMockDiscordApi } from "../helpers/mock-discord-api";
import { createMockRsiClient } from "../helpers/mock-rsi-client";
import {
  mockEnv,
  TEST_ROLE_IDS,
  testRoleIdToName,
} from "../helpers/mock-env";

const env = mockEnv();
const roleIdToName = testRoleIdToName();

function verifyRecord(overrides: Partial<VerifyRecord> = {}): VerifyRecord {
  return {
    discordUserId: "user-1",
    rsiHandle: "Test_Pilot",
    verifyPath: "scanz",
    orgSid: "SCANZ",
    grantedRoles: ["scanz", "verified"],
    partnerOrgRoleId: null,
    verifiedAt: 1_700_000_000_000,
    lastAuditedAt: null,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe("checkMemberAudit", () => {
  it("returns no drift when RSI and Discord roles match", async () => {
    const api = createMockDiscordApi({
      getGuildMember: async () => ({
        user: { id: "user-1", username: "test_pilot" },
        roles: [TEST_ROLE_IDS.scanz, TEST_ROLE_IDS.verified],
        nick: "Test_Pilot",
      }),
    });
    const rsiClient = createMockRsiClient({
      citizenFixture: "citizen-scanz-main.html",
      orgFixture: "org-members-found.json",
    });

    const result = await checkMemberAudit(
      env,
      api,
      verifyRecord(),
      roleIdToName,
      { rsiClient, rateLimitMs: 0 },
    );

    expect(result.hasDrift).toBe(false);
    expect(result.inconclusive).toBe(false);
    expect(result.driftTypes).toEqual([]);
    expect(result.expectedRoleKeys).toEqual(["scanz", "verified"]);
  });

  it("detects drift when member keeps @SCANZ but RSI is affiliate-only", async () => {
    const api = createMockDiscordApi({
      getGuildMember: async () => ({
        user: { id: "user-1", username: "affiliate_user" },
        roles: [TEST_ROLE_IDS.scanz],
        nick: "Affiliate_User",
      }),
    });
    const rsiClient = createMockRsiClient({
      citizenFixture: "citizen-affiliate.html",
      orgFixture: "org-members-prefix-false-positive.json",
    });

    const result = await checkMemberAudit(
      env,
      api,
      verifyRecord({
        rsiHandle: "Affiliate_User",
        grantedRoles: ["affiliate"],
      }),
      roleIdToName,
      { rsiClient, rateLimitMs: 0 },
    );

    expect(result.hasDrift).toBe(true);
    expect(result.inconclusive).toBe(false);
    expect(result.driftTypes).toContain("left_org");
  });

  it("flags profile_gone when citizen page returns 404", async () => {
    const api = createMockDiscordApi();
    const rsiClient = createMockRsiClient({
      citizenStatus: HttpStatus.NOT_FOUND,
    });

    const result = await checkMemberAudit(
      env,
      api,
      verifyRecord(),
      roleIdToName,
      { rsiClient, rateLimitMs: 0 },
    );

    expect(result.hasDrift).toBe(true);
    expect(result.inconclusive).toBe(false);
    expect(result.driftTypes).toContain("profile_gone");
  });

  it("returns inconclusive when RSI citizen fetch fails", async () => {
    const api = createMockDiscordApi();
    const rsiClient = createMockRsiClient({ citizenThrows: true });

    const result = await checkMemberAudit(
      env,
      api,
      verifyRecord(),
      roleIdToName,
      { rsiClient, rateLimitMs: 0 },
    );

    expect(result.hasDrift).toBe(false);
    expect(result.inconclusive).toBe(true);
    expect(result.driftTypes).toContain("rsi_unreachable");
    expect(result.issue).toContain("citizen page");
  });

  it("returns inconclusive when Discord member fetch fails", async () => {
    const api = createMockDiscordApi({
      getGuildMember: async () => {
        throw new Error("member not found");
      },
    });
    const rsiClient = createMockRsiClient({
      citizenFixture: "citizen-scanz-main.html",
      orgFixture: "org-members-found.json",
    });

    const result = await checkMemberAudit(
      env,
      api,
      verifyRecord(),
      roleIdToName,
      { rsiClient, rateLimitMs: 0 },
    );

    expect(result.hasDrift).toBe(false);
    expect(result.inconclusive).toBe(true);
    expect(result.issue).toContain("Discord member");
  });
});
