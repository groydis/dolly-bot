import { SCANZ_SID } from "./org-symbol";
import type { VerifyPath } from "./verify-types";

const PARTNER_NICK_PATTERN = /^\[([A-Za-z0-9_]+)\]\s+(.+)$/;

export interface ParsedVerifyNickname {
  rsiHandle: string;
  orgSid: string;
  verifyPath: VerifyPath;
}

export function parseVerifyNickname(
  nick: string | null | undefined,
): ParsedVerifyNickname | null {
  if (!nick || nick.trim().length === 0) {
    return null;
  }

  const trimmed = nick.trim();
  const partnerMatch = trimmed.match(PARTNER_NICK_PATTERN);

  if (partnerMatch?.[1] && partnerMatch[2]) {
    const orgSid = partnerMatch[1].toUpperCase();
    const handle = partnerMatch[2].trim();

    if (handle.length === 0) {
      return null;
    }

    return {
      rsiHandle: handle,
      orgSid,
      verifyPath: orgSid === SCANZ_SID ? "scanz" : "partner",
    };
  }

  return {
    rsiHandle: trimmed,
    orgSid: SCANZ_SID,
    verifyPath: "scanz",
  };
}
