import { SCANZ_SID } from "../../lib/org-symbol";
import type {
  PartnerRoleClassification,
  RoleClassification,
  VerifyRoleKey,
} from "./rsi/types";

export function classifyVerificationRoles(
  mainOrgSid: string | null,
  orgApiFound: boolean,
): RoleClassification {
  const isScanzMainOrg =
    mainOrgSid !== null && mainOrgSid.toUpperCase() === SCANZ_SID;

  if (isScanzMainOrg) {
    return {
      roles: ["scanz", "verified"],
      reason: "SCANZ main org on citizen page",
    };
  }

  if (orgApiFound) {
    return {
      roles: ["scanz", "affiliate", "verified"],
      reason: "Found on org roster but SCANZ is not main org on citizen page",
    };
  }

  return {
    roles: ["affiliate"],
    reason: "Not found on org roster",
  };
}

export function isAffiliateOnly(roles: readonly VerifyRoleKey[]): boolean {
  return roles.length === 1 && roles[0] === "affiliate";
}

export function classifyPartnerOrgRoles(
  orgSid: string,
  orgApiFound: boolean,
): PartnerRoleClassification {
  if (orgApiFound) {
    return {
      roles: ["affiliate", "verified", "partner_org"],
      orgSid,
      orgVerificationFailed: false,
      reason: `Found on ${orgSid} org roster`,
    };
  }

  return {
    roles: ["affiliate"],
    orgSid,
    orgVerificationFailed: true,
    reason: `Not found on ${orgSid} org roster`,
  };
}
