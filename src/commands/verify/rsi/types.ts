export interface VerifyOutcome {
  path: "scanz" | "partner";
  handle: string;
  orgSid: string;
  nickname: string;
  affiliateOnly: boolean;
  scanzRoleReviewNeeded?: boolean;
  channelName?: string;
}
