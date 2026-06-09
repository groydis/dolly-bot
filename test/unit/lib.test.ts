import { describe, expect, it } from "vitest";
import { VERIFY_BUTTON_PREFIX } from "../../src/commands/verify/constants";
import { HttpStatus, isHttpOk } from "../../src/lib/http-status";
import {
  isScanzPath,
  isValidOrgSymbol,
  mainOrgSidMatchesOrg,
  normalizeOrgSymbol,
  orgRoleName,
  resolveRosterOrgSymbol,
} from "../../src/lib/org-symbol";
import { parseVerifyNickname } from "../../src/lib/parse-verify-nickname";
import { isValidRsiHandle } from "../../src/lib/validate-handle";
import { parseVerifyConfirmCustomId } from "../../src/lib/verify-session";

describe("isValidRsiHandle", () => {
  it("accepts valid handles", () => {
    expect(isValidRsiHandle("Abc")).toBe(true);
    expect(isValidRsiHandle("Test_Pilot")).toBe(true);
  });

  it("rejects too short or invalid chars", () => {
    expect(isValidRsiHandle("ab")).toBe(false);
    expect(isValidRsiHandle("bad-handle")).toBe(false);
  });
});

describe("org-symbol", () => {
  it("normalizes empty to SCANZ", () => {
    expect(normalizeOrgSymbol(null)).toBe("SCANZ");
    expect(normalizeOrgSymbol("  zap  ")).toBe("ZAP");
  });

  it("validates org symbols", () => {
    expect(isValidOrgSymbol("ZAP")).toBe(true);
    expect(isValidOrgSymbol("A")).toBe(false);
  });

  it("detects scanz path", () => {
    expect(isScanzPath("SCANZ")).toBe(true);
    expect(isScanzPath("ZAP")).toBe(false);
  });

  it("builds org role name", () => {
    expect(orgRoleName("ZAP")).toBe("org_zap");
  });

  it("prefers citizen-page SID casing for roster lookup", () => {
    expect(resolveRosterOrgSymbol("ZAP", "ZaP")).toBe("ZaP");
    expect(resolveRosterOrgSymbol("ZAP", "OTHER")).toBe("ZAP");
  });

  it("matches main org sid case-insensitively", () => {
    expect(mainOrgSidMatchesOrg("zap", "ZAP")).toBe(true);
    expect(mainOrgSidMatchesOrg("OTHER", "ZAP")).toBe(false);
    expect(mainOrgSidMatchesOrg(null, "ZAP")).toBe(false);
  });
});

describe("parseVerifyNickname", () => {
  it("parses plain handle as scanz path", () => {
    expect(parseVerifyNickname("Test_Pilot")).toEqual({
      rsiHandle: "Test_Pilot",
      orgSid: "SCANZ",
      verifyPath: "scanz",
    });
  });

  it("parses partner nickname", () => {
    expect(parseVerifyNickname("[ZAP] Test_Pilot")).toEqual({
      rsiHandle: "Test_Pilot",
      orgSid: "ZAP",
      verifyPath: "partner",
    });
  });
});

describe("http-status", () => {
  it("isHttpOk only for 200", () => {
    expect(isHttpOk(HttpStatus.OK)).toBe(true);
    expect(isHttpOk(HttpStatus.NOT_FOUND)).toBe(false);
  });
});

describe("parseVerifyConfirmCustomId", () => {
  it("extracts session id from valid custom id", () => {
    const sessionId = "abc-123";
    expect(
      parseVerifyConfirmCustomId(`${VERIFY_BUTTON_PREFIX}${sessionId}`),
    ).toBe(sessionId);
  });

  it("returns null for wrong prefix or empty id", () => {
    expect(parseVerifyConfirmCustomId("wrong:abc")).toBeNull();
    expect(parseVerifyConfirmCustomId(VERIFY_BUTTON_PREFIX)).toBeNull();
  });
});
