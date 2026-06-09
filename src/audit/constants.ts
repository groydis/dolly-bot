import { KV_TTL_ONE_HOUR_SECONDS } from "../lib/kv-constants";

/** Wall-clock budget per Worker invocation (stay under waitUntil limits). */
export const AUDIT_TIME_BUDGET_MS = 25_000;

export const AUDIT_STATE_TTL_SECONDS = KV_TTL_ONE_HOUR_SECONDS;

export const AUDIT_CONTINUE_PATH = "/internal/audit-continue";

/** RSI citizen + org roster fetch per member during batch audit. */
export const RSI_CALLS_PER_MEMBER = 2;

/** Rough ETA: RSI_CALLS_PER_MEMBER requests × RSI_REQUEST_DELAY_MS per member. */
export function estimateAuditMinutes(memberCount: number): number {
  return Math.max(1, Math.ceil((memberCount * RSI_CALLS_PER_MEMBER) / 60));
}
