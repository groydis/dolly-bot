import type { Env } from "../../src/env";
import type { MemoryD1 } from "./memory-d1";
import type { MemoryKv } from "./memory-kv";

export const TEST_GUILD_ID = "guild-1";
export const TEST_AUDIT_CHANNEL_ID = "audit-ch-1";
export const TEST_PARTNER_CATEGORY_ID = "cat-1";

export const TEST_ROLE_IDS = {
  scanz: "1111111111111111111",
  verified: "2222222222222222222",
  affiliate: "3333333333333333333",
  orgZap: "4444444444444444444",
} as const;

export function mockEnv(overrides: Partial<Env> = {}): Env {
  return {
    DISCORD_GUILD_ID: TEST_GUILD_ID,
    AUDIT_CHANNEL_ID: TEST_AUDIT_CHANNEL_ID,
    PARTNER_ORG_CATEGORY_ID: TEST_PARTNER_CATEGORY_ID,
    SCANZ_ROLE_ID: TEST_ROLE_IDS.scanz,
    VERIFIED_ROLE_ID: TEST_ROLE_IDS.verified,
    AFFILIATE_ROLE_ID: TEST_ROLE_IDS.affiliate,
    ...overrides,
  } as Env;
}

export function mockEnvWithStorage(input?: {
  kv?: MemoryKv;
  db?: MemoryD1;
  env?: Partial<Env>;
}): Env {
  const kv = input?.kv;
  const db = input?.db;

  return mockEnv({
    ...(kv ? { VERIFY_KV: kv } : {}),
    ...(db ? { VERIFY_DB: db } : {}),
    ...input?.env,
  });
}

export function testRoleIdToName(): Map<string, string> {
  return new Map([
    [TEST_ROLE_IDS.scanz, "@SCANZ"],
    [TEST_ROLE_IDS.verified, "@Verified"],
    [TEST_ROLE_IDS.affiliate, "@Affiliate"],
    [TEST_ROLE_IDS.orgZap, "@ZAP"],
  ]);
}
