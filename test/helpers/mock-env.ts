import type { Env } from "../../src/env";

export const TEST_ROLE_IDS = {
  scanz: "1111111111111111111",
  verified: "2222222222222222222",
  affiliate: "3333333333333333333",
  orgZap: "4444444444444444444",
} as const;

export function mockEnv(overrides: Partial<Env> = {}): Env {
  return {
    SCANZ_ROLE_ID: TEST_ROLE_IDS.scanz,
    VERIFIED_ROLE_ID: TEST_ROLE_IDS.verified,
    AFFILIATE_ROLE_ID: TEST_ROLE_IDS.affiliate,
    ...overrides,
  } as Env;
}
