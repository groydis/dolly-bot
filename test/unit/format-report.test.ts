import { describe, expect, it } from "vitest";
import { estimateAuditMinutes } from "../../src/audit/constants";
import {
  buildRoleIdToNameMap,
  roleMapFromRecord,
  roleMapToRecord,
} from "../../src/audit/role-map";
import {
  formatSingleMemberReport,
  summarizeAuditRun,
} from "../../src/audit/format-report";
import type { AuditRunResult } from "../../src/audit/types";
import { memberAuditResult } from "../helpers/member-audit";

function auditFixture(
  results: ReturnType<typeof memberAuditResult>[],
): AuditRunResult {
  const driftCases = results.filter((r) => r.hasDrift);
  return {
    runAt: "2024-01-15T12:00:00.000Z",
    runType: "manual",
    results,
    driftCases,
    r2Key: "audits/2024-01-15/manual-12-00Z.csv",
  };
}

describe("summarizeAuditRun", () => {
  it("counts checked, drift, inconclusive, and ok", () => {
    const summary = summarizeAuditRun(
      auditFixture([
        memberAuditResult(),
        memberAuditResult({ hasDrift: true, inconclusive: false }),
        memberAuditResult({ inconclusive: true, issue: "RSI down" }),
      ]),
    );
    expect(summary).toEqual({
      checked: 3,
      needReview: 1,
      inconclusive: 1,
      ok: 1,
    });
  });
});

describe("formatSingleMemberReport", () => {
  it("reports OK member", () => {
    const message = formatSingleMemberReport(memberAuditResult());
    expect(message).toContain("looks OK on RSI");
  });

  it("reports inconclusive member", () => {
    const message = formatSingleMemberReport(
      memberAuditResult({ inconclusive: true, issue: "Could not reach RSI" }),
    );
    expect(message).toContain("inconclusive");
    expect(message).toContain("Could not reach RSI");
  });

  it("reports drift member", () => {
    const message = formatSingleMemberReport(
      memberAuditResult({
        hasDrift: true,
        issue: "Handle mismatch",
        driftTypes: ["handle_mismatch"],
        discordRoleNames: ["SCANZ"],
        expectedRoleKeys: ["affiliate"],
      }),
    );
    expect(message).toContain("Review:");
    expect(message).toContain("Handle mismatch");
  });
});

describe("estimateAuditMinutes", () => {
  it("returns minimum of 1 minute", () => {
    expect(estimateAuditMinutes(0)).toBe(1);
    expect(estimateAuditMinutes(30)).toBe(1);
  });

  it("scales with member count", () => {
    expect(estimateAuditMinutes(100)).toBe(4);
  });
});

describe("role-map helpers", () => {
  it("round-trips role id to name map", () => {
    const roles = [
      { id: "1", name: "SCANZ" },
      { id: "2", name: "Verified" },
    ];
    const map = buildRoleIdToNameMap(roles);
    const record = roleMapToRecord(map);
    expect(roleMapFromRecord(record).get("1")).toBe("SCANZ");
  });
});
