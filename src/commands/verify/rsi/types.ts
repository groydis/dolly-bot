export interface CitizenFetchResult {
  status: number;
  html: string;
  latencyMs: number;
}

export interface ParsedCitizen {
  handle: string | null;
  mainOrgSid: string | null;
  bioText: string | null;
}

export interface OrgMembersApiResponse {
  success?: number;
  code?: string;
  msg?: string;
  data?: {
    totalrows?: number;
    html?: string;
  };
}

export interface OrgMembersFetchResult {
  status: number;
  body: string;
  latencyMs: number;
}

export interface ParsedOrgMembers {
  totalRows: number;
  found: boolean;
  isAffiliate: boolean;
  hasOrgMain: boolean;
  html: string | null;
}

export type VerifyRoleKey = "scanz" | "verified" | "affiliate";

export interface RoleClassification {
  roles: VerifyRoleKey[];
  reason: string;
}

export interface PartnerRoleClassification {
  roles: Array<"affiliate" | "verified" | "partner_org">;
  orgSid: string;
  orgVerificationFailed: boolean;
  reason: string;
}

export interface VerifyOutcome {
  path: "scanz" | "partner";
  handle: string;
  orgSid: string;
  nickname: string;
  affiliateOnly: boolean;
  scanzRoleReviewNeeded?: boolean;
  channelName?: string;
}
