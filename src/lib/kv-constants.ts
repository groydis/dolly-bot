/** Default KV expiration for short-lived bot state (sessions, audit runs). */
export const KV_TTL_ONE_HOUR_SECONDS = 3600;

/** Partner org role/channel IDs — long-lived; delete KV keys if Discord resources are removed manually. */
export const KV_TTL_ORG_PROVISION_SECONDS = 60 * 60 * 24 * 30;
