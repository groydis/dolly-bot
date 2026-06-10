import { KV_TTL_ONE_HOUR_SECONDS } from "../../lib/kv-constants";

export const VERIFY_BUTTON_PREFIX = "verify:confirm:";
export const VERIFY_START_SCANZ_ID = "verify:start:scanz";
export const VERIFY_START_PARTNER_ID = "verify:start:partner";
export const VERIFY_MODAL_SCANZ_ID = "verify:modal:scanz";
export const VERIFY_MODAL_PARTNER_ID = "verify:modal:partner";
export const VERIFY_MODAL_HANDLE_FIELD = "handle";
export const VERIFY_MODAL_ORG_FIELD = "org";
export const VERIFY_SESSION_TTL_SECONDS = KV_TTL_ONE_HOUR_SECONDS;
export const RSI_PROFILE_EDIT_URL =
  "https://robertsspaceindustries.com/en/account/profile";
export const VERIFY_CODE_LENGTH = 6;
export const VERIFY_CHANNEL_EMBED_COLOR = 0x5865f2;

export function isVerifyStartButtonId(customId: string): boolean {
  return (
    customId === VERIFY_START_SCANZ_ID || customId === VERIFY_START_PARTNER_ID
  );
}

export function isVerifyModalId(customId: string): boolean {
  return (
    customId === VERIFY_MODAL_SCANZ_ID || customId === VERIFY_MODAL_PARTNER_ID
  );
}
