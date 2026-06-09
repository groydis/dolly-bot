import { describe, expect, it } from "vitest";
import { detectDrift } from "../../src/audit/detect-drift";
import {
  detectCitizenStatusDrift,
  detectHandleMismatchDrift,
  detectPartnerRoleDrift,
  detectScanzRoleDrift,
} from "../../src/audit/drift-predicates";
import type { DriftInput } from "../../src/audit/types";
import { HttpStatus } from "../../src/lib/http-status";
import { mockEnv, TEST_ROLE_IDS } from "../helpers/mock-env";

const env = mockEnv();

function baseDriftInput(overrides: Partial<DriftInput> = {}): DriftInput {
  return {
    verifyPath: "scanz",
    orgSid: "SCANZ",
    storedHandle: "Test_Pilot",
    citizenHandle: "Test_Pilot",
    citizenStatus: HttpStatus.OK,
    expectedRoleKeys: ["affiliate"],
    currentRoleIds: [],
    partnerOrgRoleId: null,
    rsiReason: "",
    roleIdToName: new Map(),
    ...overrides,
  };
}

describe("detectCitizenStatusDrift", () => {
  it("returns profile_gone on 404", () => {
    const result = detectCitizenStatusDrift(HttpStatus.NOT_FOUND);
    expect(result).toMatchObject({
      driftTypes: ["profile_gone"],
      hasDrift: true,
      inconclusive: false,
    });
  });

  it("returns inconclusive on non-200", () => {
    const result = detectCitizenStatusDrift(503);
    expect(result).toMatchObject({
      driftTypes: ["rsi_unreachable"],
      hasDrift: false,
      inconclusive: true,
    });
  });

  it("returns null on 200", () => {
    expect(detectCitizenStatusDrift(HttpStatus.OK)).toBeNull();
  });
});

describe("detectHandleMismatchDrift", () => {
  it("detects handle mismatch", () => {
    const result = detectHandleMismatchDrift({
      citizenHandle: "Other_Handle",
      storedHandle: "Test_Pilot",
    });
    expect(result?.driftType).toBe("handle_mismatch");
  });
});

describe("detectScanzRoleDrift", () => {
  it("flags @SCANZ when affiliate-only expected", () => {
    const findings = detectScanzRoleDrift(env, {
      expectedRoleKeys: ["affiliate"],
      currentRoleIds: [TEST_ROLE_IDS.scanz],
    });
    expect(findings[0]?.driftType).toBe("left_org");
  });

  it("flags @Verified when affiliate-only expected", () => {
    const findings = detectScanzRoleDrift(env, {
      expectedRoleKeys: ["affiliate"],
      currentRoleIds: [TEST_ROLE_IDS.verified],
    });
    expect(findings[0]?.driftType).toBe("lost_verified");
  });
});

describe("detectPartnerRoleDrift", () => {
  it("flags stale org role when not on roster", () => {
    const roleIdToName = new Map([[TEST_ROLE_IDS.orgZap, "org_zap"]]);
    const findings = detectPartnerRoleDrift({
      verifyPath: "partner",
      orgSid: "ZAP",
      expectedRoleKeys: ["affiliate"],
      currentRoleIds: [TEST_ROLE_IDS.orgZap],
      partnerOrgRoleId: TEST_ROLE_IDS.orgZap,
      roleIdToName,
    });
    expect(findings.some((f) => f.driftType === "left_org")).toBe(true);
  });
});

describe("detectDrift", () => {
  it("returns no drift when citizen and roles align", () => {
    const result = detectDrift(env, baseDriftInput({
      expectedRoleKeys: ["affiliate"],
      currentRoleIds: [TEST_ROLE_IDS.affiliate],
    }));
    expect(result.hasDrift).toBe(false);
    expect(result.inconclusive).toBe(false);
  });

  it("merges handle mismatch with role drift", () => {
    const result = detectDrift(env, baseDriftInput({
      citizenHandle: "Other_Handle",
      expectedRoleKeys: ["affiliate"],
      currentRoleIds: [TEST_ROLE_IDS.scanz],
    }));
    expect(result.driftTypes).toContain("handle_mismatch");
    expect(result.driftTypes).toContain("left_org");
    expect(result.hasDrift).toBe(true);
  });

  it("short-circuits on inconclusive citizen status", () => {
    const result = detectDrift(env, baseDriftInput({
      citizenStatus: 503,
    }));
    expect(result.inconclusive).toBe(true);
    expect(result.hasDrift).toBe(false);
  });
});
