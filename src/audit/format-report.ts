import type { AuditRunResult, DriftType, MemberAuditResult } from "./types";

function formatVerifiedAt(timestamp: number): string {
  if (timestamp <= 0) {
    return "unknown";
  }

  return new Date(timestamp).toISOString().slice(0, 10);
}

function formatDriftEntry(result: MemberAuditResult): string {
  const lines = [
    `**Review: <@${result.discordUserId}>** (\`${result.rsiHandle}\`)`,
    `Path: ${result.verifyPath} | Verified: ${formatVerifiedAt(result.verifiedAt)}`,
    `Issue: ${result.issue}`,
    `Discord: ${result.discordRoleNames.map((name) => `@${name}`).join(", ") || "none"}`,
    `RSI expects: ${result.expectedRoleKeys.join(", ") || "none"}`,
  ];

  return lines.join("\n");
}

function countDriftTypes(
  driftCases: readonly MemberAuditResult[],
): Partial<Record<DriftType, number>> {
  const counts: Partial<Record<DriftType, number>> = {};

  for (const driftCase of driftCases) {
    for (const driftType of driftCase.driftTypes) {
      if (driftType === "rsi_unreachable") {
        continue;
      }

      counts[driftType] = (counts[driftType] ?? 0) + 1;
    }
  }

  return counts;
}

const DRIFT_TYPE_LABELS: Record<DriftType, string> = {
  left_org: "Left org",
  lost_verified: "Lost verified",
  profile_gone: "Profile gone",
  handle_mismatch: "Handle mismatch",
  rsi_unreachable: "RSI unreachable",
};

export function summarizeAuditRun(audit: AuditRunResult): {
  checked: number;
  needReview: number;
  inconclusive: number;
  ok: number;
} {
  const checked = audit.results.length;
  const needReview = audit.driftCases.length;
  const inconclusive = audit.results.filter((result) => result.inconclusive).length;

  return {
    checked,
    needReview,
    inconclusive,
    ok: checked - needReview - inconclusive,
  };
}

export function formatAuditChannelSummary(audit: AuditRunResult): string {
  const { checked, needReview, inconclusive, ok } = summarizeAuditRun(audit);

  const lines = [
    `**Verify audit** (${audit.runType})`,
    `Members checked: **${checked}**`,
    `Need review: **${needReview}**`,
    `Inconclusive: **${inconclusive}**`,
    `OK: **${ok}**`,
    `Run: ${audit.runAt}`,
  ];

  const driftCounts = countDriftTypes(audit.driftCases);
  const breakdown = Object.entries(driftCounts)
    .map(([type, count]) => `${DRIFT_TYPE_LABELS[type as DriftType]}: ${count}`)
    .join(" · ");

  if (breakdown.length > 0) {
    lines.push("", breakdown);
  }

  lines.push("", "See the attached CSV for member-level detail.");

  return lines.join("\n");
}

export function formatSingleMemberReport(result: MemberAuditResult): string {
  if (!result.hasDrift && !result.inconclusive) {
    return `**<@${result.discordUserId}>** (\`${result.rsiHandle}\`) — looks OK on RSI.`;
  }

  if (result.inconclusive) {
    return [
      `**<@${result.discordUserId}>** (\`${result.rsiHandle}\`) — inconclusive`,
      result.issue,
    ].join("\n");
  }

  return formatDriftEntry(result);
}
