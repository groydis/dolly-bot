import { createDiscordApiClient } from "../discord/api";
import { getVerifyRecord, touchAuditTimestamp } from "../db/verify-records";
import type { Env } from "../env";
import {
  deleteAuditRunState,
  getAuditRunState,
  saveAuditRunState,
  type AuditRunState,
} from "./audit-run-state";
import { checkMemberAudit } from "./check-member";
import { AUDIT_CONTINUE_PATH, AUDIT_TIME_BUDGET_MS, estimateAuditMinutes } from "./constants";
import { buildCsv, uploadAuditCsv } from "./export-csv";
import { postAuditReport } from "./run-audit";
import type { AuditRunResult, AuditRunType, MemberAuditResult } from "./types";

function roleMapFromState(state: AuditRunState): Map<string, string> {
  return new Map(Object.entries(state.roleIdToName));
}

export async function processAuditRunBatch(
  env: Env,
  runId: string,
): Promise<void> {
  const state = await getAuditRunState(env.VERIFY_KV, runId);
  if (!state) {
    console.error("Audit run state not found", { runId });
    return;
  }

  const api = createDiscordApiClient(env);
  const roleIdToName = roleMapFromState(state);
  const started = Date.now();
  let index = state.nextIndex;

  console.log("Audit batch starting", {
    runId,
    runType: state.runType,
    index,
    total: state.discordUserIds.length,
  });

  while (
    index < state.discordUserIds.length &&
    Date.now() - started < AUDIT_TIME_BUDGET_MS
  ) {
    const discordUserId = state.discordUserIds[index]!;
    const record = await getVerifyRecord(env.VERIFY_DB, discordUserId);

    if (record) {
      const result = await checkMemberAudit(env, api, record, roleIdToName);
      state.results.push(result);

      if (!result.inconclusive) {
        await touchAuditTimestamp(env.VERIFY_DB, discordUserId, Date.now());
      }
    } else {
      console.warn("Verify record missing during audit", { discordUserId, runId });
    }

    index++;
  }

  state.nextIndex = index;
  await saveAuditRunState(env.VERIFY_KV, state);

  if (index < state.discordUserIds.length) {
    console.log("Audit batch continuing", {
      runId,
      processed: index,
      total: state.discordUserIds.length,
    });
    await scheduleAuditContinuation(env, runId);
    return;
  }

  console.log("Audit run completing", {
    runId,
    total: state.results.length,
  });

  await finalizeAuditRun(env, api, state);
  await deleteAuditRunState(env.VERIFY_KV, runId);
}

function buildContinuationRequest(runId: string): Request {
  return new Request(`https://internal${AUDIT_CONTINUE_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId }),
  });
}

async function scheduleAuditContinuation(
  env: Env,
  runId: string,
): Promise<void> {
  const request = buildContinuationRequest(runId);
  const response = await env.WORKER_SELF.fetch(request);

  if (!response.ok) {
    const body = await response.text();
    console.error("Failed to schedule audit continuation", {
      runId,
      status: response.status,
      body,
    });
    throw new Error(`Audit continuation failed: ${response.status}`);
  }
}

async function finalizeAuditRun(
  env: Env,
  api: ReturnType<typeof createDiscordApiClient>,
  state: AuditRunState,
): Promise<void> {
  const driftCases = state.results.filter((result) => result.hasDrift);
  const runAt = new Date(state.runAtIso);
  const csvBody = buildCsv(state.runAtIso, state.runType, state.results);
  const r2Key = await uploadAuditCsv(
    env.AUDIT_BUCKET,
    runAt,
    state.runType,
    csvBody,
    state.userIdSuffix,
  );

  const audit: AuditRunResult = {
    runAt: state.runAtIso,
    runType: state.runType,
    results: state.results,
    driftCases,
    r2Key,
  };

  if (state.postToChannel) {
    try {
      await postAuditReport(env, api, audit, csvBody);
    } catch (error) {
      console.error("Failed to post audit report to Discord", {
        runId: state.runId,
        r2Key,
        error,
      });
    }
  }

  console.log("Audit run finished", {
    runId: state.runId,
    checked: state.results.length,
    drift: driftCases.length,
    r2Key,
  });
}

export interface StartAuditRunOptions {
  runType: AuditRunType;
  discordUserIds: string[];
  userIdSuffix?: string;
  postToChannel: boolean;
}

export async function startAuditRun(
  env: Env,
  options: StartAuditRunOptions,
): Promise<{ runId: string; total: number }> {
  const api = createDiscordApiClient(env);
  const guildRoles = await api.listGuildRoles(env.DISCORD_GUILD_ID);
  const roleIdToName = Object.fromEntries(
    guildRoles.map((role) => [role.id, role.name]),
  );

  const runId = crypto.randomUUID();
  const state: AuditRunState = {
    runId,
    runType: options.runType,
    runAtIso: new Date().toISOString(),
    userIdSuffix: options.userIdSuffix,
    discordUserIds: options.discordUserIds,
    nextIndex: 0,
    results: [],
    roleIdToName,
    postToChannel: options.postToChannel,
  };

  await saveAuditRunState(env.VERIFY_KV, state);

  return { runId, total: options.discordUserIds.length };
}

export function buildAuditStartedMessage(total: number): string {
  const minutes = estimateAuditMinutes(total);
  return [
    `**Verify audit started** — checking ${total} member(s) against RSI.`,
    "",
    `This runs in the background and may take ~${minutes} minute(s).`,
    "Drift cases will post to the audit channel when complete.",
    "Full CSV will be saved to R2.",
  ].join("\n");
}

export async function runSingleMemberAudit(
  env: Env,
  api: ReturnType<typeof createDiscordApiClient>,
  discordUserId: string,
): Promise<{ result: MemberAuditResult; r2Key: string }> {
  const record = await getVerifyRecord(env.VERIFY_DB, discordUserId);
  if (!record) {
    throw new Error("AUDIT_RECORD_NOT_FOUND");
  }

  const guildRoles = await api.listGuildRoles(env.DISCORD_GUILD_ID);
  const roleIdToName = new Map(guildRoles.map((role) => [role.id, role.name]));
  const result = await checkMemberAudit(env, api, record, roleIdToName);

  if (!result.inconclusive) {
    await touchAuditTimestamp(env.VERIFY_DB, discordUserId, Date.now());
  }

  const runAt = new Date();
  const runAtIso = runAt.toISOString();
  const csvBody = buildCsv(runAtIso, "manual_user", [result]);
  const r2Key = await uploadAuditCsv(
    env.AUDIT_BUCKET,
    runAt,
    "manual_user",
    csvBody,
    discordUserId,
  );

  return { result, r2Key };
}
