import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  citizenHandlesMatch,
  extractVerifyCode,
  normalizeBioHtml,
  parseCitizenPage,
} from "../../src/rsi/citizen";

const fixturesDir = join(__dirname, "../fixtures/rsi");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}

describe("parseCitizenPage", () => {
  it("parses scanz main org fixture", () => {
    const parsed = parseCitizenPage(loadFixture("citizen-scanz-main.html"));
    expect(parsed.handle).toBe("Test_Pilot");
    expect(parsed.mainOrgSid).toBe("SCANZ");
    expect(parsed.bioText).toBe("[SCANZ: ABC123]");
  });

  it("parses affiliate fixture with normalized bio", () => {
    const parsed = parseCitizenPage(loadFixture("citizen-affiliate.html"));
    expect(parsed.handle).toBe("Affiliate_User");
    expect(parsed.mainOrgSid).toBe("OTHERORG");
    expect(parsed.bioText).toBe("Hello & welcome\nto the verse");
  });
});

describe("normalizeBioHtml", () => {
  it("strips tags and decodes entities", () => {
    expect(normalizeBioHtml("Hello &amp; <b>world</b><br>line2")).toBe(
      "Hello & world\nline2",
    );
  });
});

describe("extractVerifyCode", () => {
  it("matches verify code in bio", () => {
    expect(extractVerifyCode("[SCANZ: ABC123]", "ABC123", "SCANZ")).toBe(
      true,
    );
  });

  it("rejects wrong code or org", () => {
    expect(extractVerifyCode("[SCANZ: ABC123]", "WRONG", "SCANZ")).toBe(false);
    expect(extractVerifyCode("[ZAP: ABC123]", "ABC123", "SCANZ")).toBe(false);
  });
});

describe("citizenHandlesMatch", () => {
  it("compares case-insensitively", () => {
    expect(citizenHandlesMatch("test_pilot", "Test_Pilot")).toBe(true);
    expect(citizenHandlesMatch("test_pilot", null)).toBe(false);
  });
});
