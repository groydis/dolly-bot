export type AuditRunType = "weekly" | "manual" | "manual_user";

export type DriftType =
  | "left_org"
  | "lost_verified"
  | "profile_gone"
  | "handle_mismatch"
  | "rsi_unreachable";

export interface MemberAuditResult {
  discordUserId: string;
  rsiHandle: string;
  verifyPath: "scanz" | "partner";
  orgSid: string;
  verifiedAt: number;
  driftTypes: DriftType[];
  issue: string;
  discordRoleNames: string[];
  expectedRoleKeys: string[];
  rsiReason: string;
  hasDrift: boolean;
  inconclusive: boolean;
}

export interface AuditRunResult {
  runAt: string;
  runType: AuditRunType;
  results: MemberAuditResult[];
  driftCases: MemberAuditResult[];
  r2Key: string;
}
