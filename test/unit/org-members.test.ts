import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isHandleInOrgMembersHtml,
  parseOrgMembersResponse,
} from "../../src/rsi/org-members";

const fixturesDir = join(__dirname, "../fixtures/rsi");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}

describe("isHandleInOrgMembersHtml", () => {
  it("finds exact handle in citizen path", () => {
    const html = '<a href="/citizens/Test_Pilot">Test_Pilot</a>';
    expect(isHandleInOrgMembersHtml(html, "Test_Pilot")).toBe(true);
    expect(isHandleInOrgMembersHtml(html, "test_pilot")).toBe(true);
  });

  it("rejects prefix false positive", () => {
    const html = '<a href="/citizens/OtherHandle">OtherHandle</a>';
    expect(isHandleInOrgMembersHtml(html, "Test_Pilot")).toBe(false);
  });
});

describe("parseOrgMembersResponse", () => {
  it("finds member when handle matches HTML", () => {
    const result = parseOrgMembersResponse(
      loadFixture("org-members-found.json"),
      "Test_Pilot",
    );
    expect(result.found).toBe(true);
    expect(result.totalRows).toBe(1);
  });

  it("rejects prefix false positive despite totalRows", () => {
    const result = parseOrgMembersResponse(
      loadFixture("org-members-prefix-false-positive.json"),
      "Test_Pilot",
    );
    expect(result.totalRows).toBe(1);
    expect(result.found).toBe(false);
  });

  it("returns not found for invalid JSON", () => {
    const result = parseOrgMembersResponse("not json", "Test_Pilot");
    expect(result.found).toBe(false);
    expect(result.totalRows).toBe(0);
  });
});
