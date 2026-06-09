import { listAllVerifyRecords } from "../db/verify-records";
import type { Env } from "../env";
import {
  buildAuditStartedMessage,
  processAuditRunBatch,
  startAuditRun,
} from "./process-audit-run";

export async function runScheduledAudit(env: Env): Promise<void> {
  const records = await listAllVerifyRecords(env.VERIFY_DB);

  console.log("Scheduled verify audit starting", { members: records.length });

  if (records.length === 0) {
    console.log("Scheduled verify audit skipped — no verify records");
    return;
  }

  const { runId, total } = await startAuditRun(env, {
    runType: "weekly",
    discordUserIds: records.map((record) => record.discordUserId),
    postToChannel: true,
  });

  await processAuditRunBatch(env, runId);

  console.log("Scheduled verify audit dispatched", {
    runId,
    total,
    message: buildAuditStartedMessage(total),
  });
}
