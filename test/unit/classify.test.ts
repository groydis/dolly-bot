import { describe, expect, it } from "vitest";
import {
  classifyPartnerOrgRoles,
  classifyVerificationRoles,
  isAffiliateOnly,
} from "../../src/commands/verify/classify";

describe("classifyVerificationRoles", () => {
  it("grants scanz+verified when SCANZ is main org", () => {
    const result = classifyVerificationRoles("SCANZ", false);
    expect(result.roles).toEqual(["scanz", "verified"]);
    expect(result.reason).toContain("SCANZ main org");
  });

  it("grants scanz+affiliate+verified when on roster but not main org", () => {
    const result = classifyVerificationRoles("OTHER", true);
    expect(result.roles).toEqual(["scanz", "affiliate", "verified"]);
  });

  it("grants affiliate only when not on roster", () => {
    const result = classifyVerificationRoles("OTHER", false);
    expect(result.roles).toEqual(["affiliate"]);
    expect(result.reason).toContain("Not found");
  });
});

describe("classifyPartnerOrgRoles", () => {
  it("grants partner roles when on org roster", () => {
    const result = classifyPartnerOrgRoles("ZAP", true);
    expect(result.roles).toEqual(["affiliate", "verified", "partner_org"]);
    expect(result.orgVerificationFailed).toBe(false);
  });

  it("affiliate only when not on partner roster", () => {
    const result = classifyPartnerOrgRoles("ZAP", false);
    expect(result.roles).toEqual(["affiliate"]);
    expect(result.orgVerificationFailed).toBe(true);
  });

  it("grants partner roles when verify org is main org on citizen page", () => {
    const result = classifyPartnerOrgRoles("ZAP", false, "ZAP");
    expect(result.roles).toEqual(["affiliate", "verified", "partner_org"]);
    expect(result.orgVerificationFailed).toBe(false);
    expect(result.reason).toContain("main org");
  });

  it("matches main org case-insensitively", () => {
    const result = classifyPartnerOrgRoles("ZAP", false, "zap");
    expect(result.orgVerificationFailed).toBe(false);
  });
});

describe("isAffiliateOnly", () => {
  it("returns true for single affiliate role", () => {
    expect(isAffiliateOnly(["affiliate"])).toBe(true);
  });

  it("returns false for scanz+verified", () => {
    expect(isAffiliateOnly(["scanz", "verified"])).toBe(false);
  });
});
