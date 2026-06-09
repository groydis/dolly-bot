import { describe, expect, it } from "vitest";
import {
  buildCsv,
  buildR2ObjectKey,
  csvFilenameFromR2Key,
} from "../../src/audit/export-csv";
import { memberAuditResult } from "../helpers/member-audit";

describe("buildCsv", () => {
  it("includes header and escapes special characters", () => {
    const csv = buildCsv("2024-01-15T12:00:00.000Z", "manual", [
      memberAuditResult({
        issue: 'Says "hello", world',
        driftTypes: ["left_org", "handle_mismatch"],
        discordRoleNames: ["org_zap", "SCANZ"],
        expectedRoleKeys: ["affiliate"],
        rsiReason: "test",
      }),
    ]);

    expect(csv.split("\n")[0]).toContain("run_at,run_type");
    expect(csv).toContain('"Says ""hello"", world"');
    expect(csv).toContain("left_org;handle_mismatch");
    expect(csv).toContain("org_zap;SCANZ");
  });
});

describe("buildR2ObjectKey", () => {
  it("builds weekly key", () => {
    const key = buildR2ObjectKey(new Date("2024-06-09T14:30:00.000Z"), "weekly");
    expect(key).toBe("audits/2024-06-09/weekly-14-30Z.csv");
  });

  it("builds manual-user suffix key", () => {
    const key = buildR2ObjectKey(
      new Date("2024-06-09T14:30:00.000Z"),
      "manual_user",
      "user123",
    );
    expect(key).toBe("audits/2024-06-09/manual-user-user123.csv");
  });
});

describe("csvFilenameFromR2Key", () => {
  it("extracts filename from path", () => {
    expect(csvFilenameFromR2Key("audits/2024-06-09/weekly-14-30Z.csv")).toBe(
      "weekly-14-30Z.csv",
    );
  });

  it("falls back when path empty", () => {
    expect(csvFilenameFromR2Key("")).toBe("verify-audit.csv");
  });
});
