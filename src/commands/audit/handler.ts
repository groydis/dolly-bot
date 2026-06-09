import { formatSingleMemberReport } from "../../audit/format-report";
import {
  buildAuditStartedMessage,
  runSingleMemberAudit,
  startAuditRun,
} from "../../audit/process-audit-run";
import { listAllVerifyRecords } from "../../db/verify-records";
import type { AppError } from "../../errors";
import { parseUserOption } from "../../lib/options";
import { err, ok, type Result } from "../../lib/result";
import type { CommandContext, FollowUpPayload } from "../types";

export async function handleAuditCommand(
  context: CommandContext,
): Promise<Result<FollowUpPayload, AppError>> {
  const { env, interaction, api } = context;
  const targetUserId = parseUserOption(interaction, "user");

  if (targetUserId) {
    try {
      const { result } = await runSingleMemberAudit(
        env,
        api,
        targetUserId,
      );

      const content = formatSingleMemberReport(result);

      return ok({ content });
    } catch {
      return err({ code: "AUDIT_RECORD_NOT_FOUND" });
    }
  }

  const records = await listAllVerifyRecords(env.VERIFY_DB);

  if (records.length === 0) {
    return ok({
      content: "No verify records to audit yet. Run `/verify` or the backfill script first.",
    });
  }

  const { runId } = await startAuditRun(env, {
    runType: "manual",
    discordUserIds: records.map((record) => record.discordUserId),
    postToChannel: true,
  });

  return ok({
    content: buildAuditStartedMessage(records.length),
    auditRunId: runId,
  });
}
