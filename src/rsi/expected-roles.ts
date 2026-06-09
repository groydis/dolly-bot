import {
  classifyPartnerOrgRoles,
  classifyVerificationRoles,
} from "../commands/verify/classify";
import type { VerifyPath } from "../db/verify-records";
import { SCANZ_SID } from "../lib/org-symbol";
import type {
  PartnerRoleClassification,
  RoleClassification,
} from "./types";

export function rosterOrgSidForPath(
  verifyPath: VerifyPath,
  orgSid: string,
): string {
  return verifyPath === "scanz" ? SCANZ_SID : orgSid;
}

export function expectedRolesForPath(input: {
  verifyPath: VerifyPath;
  orgSid: string;
  mainOrgSid: string | null;
  orgFound: boolean;
}):
  | { verifyPath: "scanz"; classification: RoleClassification }
  | { verifyPath: "partner"; classification: PartnerRoleClassification } {
  if (input.verifyPath === "scanz") {
    return {
      verifyPath: "scanz",
      classification: classifyVerificationRoles(
        input.mainOrgSid,
        input.orgFound,
      ),
    };
  }

  return {
    verifyPath: "partner",
    classification: classifyPartnerOrgRoles(input.orgSid, input.orgFound),
  };
}

export function expectedRoleKeysForPath(input: {
  verifyPath: VerifyPath;
  orgSid: string;
  mainOrgSid: string | null;
  orgFound: boolean;
}): { expectedRoleKeys: string[]; rsiReason: string } {
  const result = expectedRolesForPath(input);

  if (result.verifyPath === "scanz") {
    return {
      expectedRoleKeys: [...result.classification.roles],
      rsiReason: result.classification.reason,
    };
  }

  return {
    expectedRoleKeys: [...result.classification.roles],
    rsiReason: result.classification.reason,
  };
}
