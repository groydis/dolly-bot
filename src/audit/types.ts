import type { VerifyPath } from "../lib/verify-types";

export type AuditRunType = "weekly" | "manual" | "manual_user";

export type DriftType =
  | "left_org"
  | "lost_verified"
  | "profile_gone"
  | "handle_mismatch"
  | "rsi_unreachable";

export interface DriftInput {
  verifyPath: VerifyPath;
  orgSid: string;
  storedHandle: string;
  citizenHandle: string | null;
  citizenStatus: number;
  expectedRoleKeys: readonly string[];
  currentRoleIds: readonly string[];
  partnerOrgRoleId: string | null;
  rsiReason: string;
  roleIdToName: Map<string, string>;
}

export interface DriftDetection {
  driftTypes: DriftType[];
  issue: string;
  hasDrift: boolean;
  inconclusive: boolean;
}

export interface MemberAuditResult {
  discordUserId: string;
  rsiHandle: string;
  verifyPath: VerifyPath;
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
