import type { MemberAuditResult } from "../../src/audit/types";

export function memberAuditResult(
  overrides: Partial<MemberAuditResult> = {},
): MemberAuditResult {
  return {
    discordUserId: "999999999999999999",
    rsiHandle: "Test_Pilot",
    verifyPath: "scanz",
    orgSid: "SCANZ",
    verifiedAt: 1_700_000_000_000,
    driftTypes: [],
    issue: "",
    discordRoleNames: [],
    expectedRoleKeys: [],
    rsiReason: "",
    hasDrift: false,
    inconclusive: false,
    ...overrides,
  };
}
