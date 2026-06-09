import { describe, expect, it } from "vitest";
import {
  expectedRoleKeysForPath,
  rosterOrgSidForPath,
} from "../../src/rsi/expected-roles";

describe("rosterOrgSidForPath", () => {
  it("uses SCANZ for scanz path", () => {
    expect(rosterOrgSidForPath("scanz", "SCANZ")).toBe("SCANZ");
  });

  it("uses org sid for partner path", () => {
    expect(rosterOrgSidForPath("partner", "ZAP")).toBe("ZAP");
  });
});

describe("expectedRoleKeysForPath", () => {
  it("returns scanz roles for main org member", () => {
    const result = expectedRoleKeysForPath({
      verifyPath: "scanz",
      orgSid: "SCANZ",
      mainOrgSid: "SCANZ",
      orgFound: true,
    });
    expect(result.expectedRoleKeys).toEqual(["scanz", "verified"]);
  });

  it("returns partner roles when on partner roster", () => {
    const result = expectedRoleKeysForPath({
      verifyPath: "partner",
      orgSid: "ZAP",
      mainOrgSid: "OTHER",
      orgFound: true,
    });
    expect(result.expectedRoleKeys).toEqual([
      "affiliate",
      "verified",
      "partner_org",
    ]);
  });
});
