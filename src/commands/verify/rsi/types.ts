export interface VerifyOutcome {
  path: "scanz" | "partner";
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
