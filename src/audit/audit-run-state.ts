import type { MemberAuditResult, AuditRunType } from "./types";
import { AUDIT_STATE_TTL_SECONDS } from "./constants";

export interface AuditRunState {
  runId: string;
  runType: AuditRunType;
  runAtIso: string;
  userIdSuffix?: string;
  discordUserIds: string[];
  nextIndex: number;
  results: MemberAuditResult[];
  roleIdToName: Record<string, string>;
  postToChannel: boolean;
}

function stateKey(runId: string): string {
  return `audit_run:${runId}`;
}

export async function saveAuditRunState(
  kv: KVNamespace,
  state: AuditRunState,
): Promise<void> {
  await kv.put(stateKey(state.runId), JSON.stringify(state), {
    expirationTtl: AUDIT_STATE_TTL_SECONDS,
  });
}

export async function getAuditRunState(
  kv: KVNamespace,
  runId: string,
): Promise<AuditRunState | null> {
  const raw = await kv.get(stateKey(runId));
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as AuditRunState;
}

export async function deleteAuditRunState(
  kv: KVNamespace,
  runId: string,
): Promise<void> {
  await kv.delete(stateKey(runId));
}
