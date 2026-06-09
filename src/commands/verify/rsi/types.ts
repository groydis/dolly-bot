import type { VerifyPath } from "../../../lib/verify-types";

export interface VerifyOutcome {
  path: VerifyPath;
  handle: string;
  orgSid: string;
  nickname: string;
  affiliateOnly: boolean;
  /** Member had @SCANZ but RSI does not grant SCANZ membership — staff alerted. */
  scanzRoleReviewNeeded?: boolean;
  /** One or more existing roles were flagged for staff review (not auto-removed). */
  roleReviewNeeded?: boolean;
  channelName?: string;
}
