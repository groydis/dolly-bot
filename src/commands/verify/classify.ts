import type { RoleClassification, VerifyRoleKey } from "./rsi/types";

const SCANZ_SID = "SCANZ";

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
