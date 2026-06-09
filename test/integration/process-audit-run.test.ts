import { afterEach, describe, expect, it, vi } from "vitest";
import { AUDIT_CONTINUE_PATH } from "../../src/audit/constants";
import { getAuditRunState, saveAuditRunState } from "../../src/audit/audit-run-state";
import { processAuditRunBatch } from "../../src/audit/process-audit-run";
import type { VerifyRecord } from "../../src/db/verify-records";
import { memberAuditResult } from "../helpers/member-audit";
import { createMemoryD1 } from "../helpers/memory-d1";
import { createMemoryKv } from "../helpers/memory-kv";
import { createMemoryR2 } from "../helpers/memory-r2";
import {
  mockEnv,
  TEST_ROLE_IDS,
} from "../helpers/mock-env";
import { createMockDiscordApi } from "../helpers/mock-discord-api";
import { createMockRsiClient } from "../helpers/mock-rsi-client";
import { createMockWorkerSelf } from "../helpers/mock-worker-self";

const USER_ONE = "user-audit-1";
const USER_TWO = "user-audit-2";
const RUN_ID = "run-test-1";

function seedVerifyRecord(db: ReturnType<typeof createMemoryD1>, record: Partial<VerifyRecord> & { discordUserId: string }) {
  db.records.set(record.discordUserId, {
    discordUserId: record.discordUserId,
    rsiHandle: record.rsiHandle ?? "Test_Pilot",
    verifyPath: record.verifyPath ?? "scanz",
    orgSid: record.orgSid ?? "SCANZ",
    grantedRoles: record.grantedRoles ?? ["scanz", "verified"],
    partnerOrgRoleId: record.partnerOrgRoleId ?? null,
    verifiedAt: record.verifiedAt ?? 1_700_000_000_000,
    lastAuditedAt: record.lastAuditedAt ?? null,
    updatedAt: record.updatedAt ?? 1_700_000_000_000,
  });
}

function setupAuditEnv() {
  const kv = createMemoryKv();
  const db = createMemoryD1();
  const r2 = createMemoryR2();
  const workerSelf = createMockWorkerSelf();

  const env = mockEnv({
    VERIFY_KV: kv,
    VERIFY_DB: db,
    AUDIT_BUCKET: r2,
    WORKER_SELF: workerSelf,
  });

  return { kv, db, r2, workerSelf, env };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("processAuditRunBatch", () => {
  it("completes a single-member run and uploads CSV to R2", async () => {
    const { kv, db, r2, env } = setupAuditEnv();
    seedVerifyRecord(db, { discordUserId: USER_ONE });

    await saveAuditRunState(kv, {
      runId: RUN_ID,
      runType: "manual",
      runAtIso: "2026-06-09T10:00:00.000Z",
      discordUserIds: [USER_ONE],
      nextIndex: 0,
      results: [],
      roleIdToName: {
        [TEST_ROLE_IDS.scanz]: "@SCANZ",
        [TEST_ROLE_IDS.verified]: "@Verified",
      },
      postToChannel: false,
    });

    const api = createMockDiscordApi({
      getGuildMember: async () => ({
        user: { id: USER_ONE, username: "test_pilot" },
        roles: [TEST_ROLE_IDS.scanz, TEST_ROLE_IDS.verified],
        nick: "Test_Pilot",
      }),
    });
    const rsiClient = createMockRsiClient({
      citizenFixture: "citizen-scanz-main.html",
      orgFixture: "org-members-found.json",
    });

    await processAuditRunBatch(env, RUN_ID, {
      api,
      rsiClient,
      rateLimitMs: 0,
    });

    expect(await getAuditRunState(kv, RUN_ID)).toBeNull();
    expect(r2.objects.size).toBe(1);
    expect([...r2.objects.values()][0]?.contentType).toBe("text/csv");
    expect(db.records.get(USER_ONE)?.lastAuditedAt).not.toBeNull();
  });

  it("schedules continuation when work remains after a batch", async () => {
    const { kv, workerSelf, env } = setupAuditEnv();

    await saveAuditRunState(kv, {
      runId: RUN_ID,
      runType: "manual",
      runAtIso: "2026-06-09T10:00:00.000Z",
      discordUserIds: [USER_ONE, USER_TWO],
      nextIndex: 1,
      results: [memberAuditResult({ discordUserId: USER_ONE })],
      roleIdToName: {
        [TEST_ROLE_IDS.scanz]: "@SCANZ",
      },
      postToChannel: false,
    });

    await processAuditRunBatch(env, RUN_ID, {
      timeBudgetMs: 0,
    });

    const state = await getAuditRunState(kv, RUN_ID);
    expect(state?.nextIndex).toBe(1);
    expect(state?.results).toHaveLength(1);
    expect(workerSelf.requests).toHaveLength(1);

    const request = workerSelf.requests[0]!;
    expect(new URL(request.url).pathname).toBe(AUDIT_CONTINUE_PATH);
    expect(await request.json()).toEqual({ runId: RUN_ID });
  });

  it("returns early when audit state is missing", async () => {
    const { env } = setupAuditEnv();

    await expect(
      processAuditRunBatch(env, "missing-run-id"),
    ).resolves.toBeUndefined();
  });
});
