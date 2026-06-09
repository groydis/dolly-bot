import { KV_TTL_ONE_HOUR_SECONDS } from "../lib/kv-constants";

/** Wall-clock budget per Worker invocation (stay under waitUntil limits). */
export const AUDIT_TIME_BUDGET_MS = 25_000;

export const AUDIT_STATE_TTL_SECONDS = KV_TTL_ONE_HOUR_SECONDS;

export const AUDIT_CONTINUE_PATH = "/internal/audit-continue";
