import type { MemberAuditResult, AuditRunType } from "./types";

const CSV_COLUMNS = [
  "run_at",
  "run_type",
  "discord_user_id",
  "rsi_handle",
  "verify_path",
  "org_sid",
  "has_drift",
  "drift_types",
  "issue",
  "discord_roles",
  "expected_roles",
  "rsi_reason",
] as const;

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function buildCsv(
  runAt: string,
  runType: AuditRunType,
  results: MemberAuditResult[],
): string {
  const header = CSV_COLUMNS.join(",");
  const rows = results.map((result) =>
    [
      runAt,
      runType,
      result.discordUserId,
      result.rsiHandle,
      result.verifyPath,
      result.orgSid,
      result.hasDrift ? "true" : "false",
      result.driftTypes.join(";"),
      result.issue,
      result.discordRoleNames.join(";"),
      result.expectedRoleKeys.join(";"),
      result.rsiReason,
    ]
      .map((field) => escapeCsvField(String(field)))
      .join(","),
  );

  return [header, ...rows].join("\n");
}

export function csvFilenameFromR2Key(r2Key: string): string {
  const segment = r2Key.split("/").pop();
  return segment && segment.length > 0 ? segment : "verify-audit.csv";
}

export function buildR2ObjectKey(
  runAt: Date,
  runType: AuditRunType,
  userIdSuffix?: string,
): string {
  const date = runAt.toISOString().slice(0, 10);
  const time = runAt.toISOString().slice(11, 16).replace(":", "-");

  if (userIdSuffix) {
    return `audits/${date}/manual-user-${userIdSuffix}.csv`;
  }

  const prefix = runType === "weekly" ? "weekly" : "manual";
  return `audits/${date}/${prefix}-${time}Z.csv`;
}

export async function uploadAuditCsv(
  bucket: R2Bucket,
  runAt: Date,
  runType: AuditRunType,
  csvBody: string,
  userIdSuffix?: string,
): Promise<string> {
  const key = buildR2ObjectKey(runAt, runType, userIdSuffix);

  await bucket.put(key, csvBody, {
    httpMetadata: { contentType: "text/csv" },
  });

  return key;
}
