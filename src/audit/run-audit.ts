import type { DiscordApi } from "../discord/api";
import type { Env } from "../env";
import { csvFilenameFromR2Key } from "./export-csv";
import { formatAuditChannelSummary, summarizeAuditRun } from "./format-report";
import type { AuditRunResult } from "./types";

export async function postAuditReport(
  env: Env,
  api: DiscordApi,
  audit: AuditRunResult,
  csvBody: string,
): Promise<void> {
  const { needReview, inconclusive } = summarizeAuditRun(audit);

  if (needReview === 0 && inconclusive === 0) {
    return;
  }

  const content = formatAuditChannelSummary(audit);
  const filename = csvFilenameFromR2Key(audit.r2Key);

  await api.postMessageWithFile(env.AUDIT_CHANNEL_ID, content, {
    filename,
    body: csvBody,
  });
}
