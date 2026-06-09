import type { Env } from "../env";
import { HttpStatus, isHttpOk } from "../lib/http-status";
import { isOrgRoleDiscordName } from "../lib/org-symbol";
import type { DriftDetection, DriftInput, DriftType } from "./types";

export type DriftFinding = { driftType: DriftType; issue: string };

export function detectCitizenStatusDrift(
  citizenStatus: number,
): DriftDetection | null {
  if (citizenStatus === HttpStatus.NOT_FOUND) {
    return {
      driftTypes: ["profile_gone"],
      issue: "RSI profile not found (404)",
      hasDrift: true,
      inconclusive: false,
    };
  }

  if (!isHttpOk(citizenStatus)) {
    return {
      driftTypes: ["rsi_unreachable"],
      issue: `RSI citizen page returned HTTP ${citizenStatus}`,
      hasDrift: false,
      inconclusive: true,
    };
  }

  return null;
}

export function detectHandleMismatchDrift(
  input: Pick<DriftInput, "citizenHandle" | "storedHandle">,
): DriftFinding | null {
  if (
    input.citizenHandle &&
    input.citizenHandle.toLowerCase() !== input.storedHandle.toLowerCase()
  ) {
    return {
      driftType: "handle_mismatch",
      issue: `RSI handle is \`${input.citizenHandle}\`, stored as \`${input.storedHandle}\``,
    };
  }

  return null;
}

export function detectScanzRoleDrift(
  env: Env,
  input: Pick<DriftInput, "expectedRoleKeys" | "currentRoleIds">,
): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const expectedKeys = new Set(input.expectedRoleKeys);
  const currentRoleIds = new Set(input.currentRoleIds);

  if (
    currentRoleIds.has(env.SCANZ_ROLE_ID) &&
    !expectedKeys.has("scanz")
  ) {
    findings.push({
      driftType: "left_org",
      issue: "Has @SCANZ but RSI no longer grants SCANZ membership",
    });
  }

  if (
    currentRoleIds.has(env.VERIFIED_ROLE_ID) &&
    !expectedKeys.has("verified")
  ) {
    findings.push({
      driftType: "lost_verified",
      issue: "Has @Verified but RSI classification is affiliate-only",
    });
  }

  return findings;
}

function detectUnexpectedOrgRolesOnMember(
  input: Pick<
    DriftInput,
    "expectedRoleKeys" | "currentRoleIds" | "partnerOrgRoleId" | "roleIdToName"
  >,
): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const expectedKeys = new Set(input.expectedRoleKeys);

  for (const roleId of input.currentRoleIds) {
    const roleName = input.roleIdToName.get(roleId);
    if (!roleName || !isOrgRoleDiscordName(roleName)) {
      continue;
    }

    const isExpectedPartnerRole =
      expectedKeys.has("partner_org") &&
      input.partnerOrgRoleId !== null &&
      roleId === input.partnerOrgRoleId;

    if (!isExpectedPartnerRole) {
      findings.push({
        driftType: "left_org",
        issue: `Has partner role @${roleName} but RSI no longer grants it`,
      });
    }
  }

  return findings;
}

function detectStalePartnerOrgRole(
  input: Pick<
    DriftInput,
    "verifyPath" | "orgSid" | "expectedRoleKeys" | "currentRoleIds" | "partnerOrgRoleId"
  >,
): DriftFinding | null {
  const expectedKeys = new Set(input.expectedRoleKeys);

  if (input.verifyPath !== "partner" || expectedKeys.has("partner_org")) {
    return null;
  }

  if (
    input.partnerOrgRoleId &&
    input.currentRoleIds.includes(input.partnerOrgRoleId)
  ) {
    return {
      driftType: "left_org",
      issue: `Not on ${input.orgSid} roster but still has org role`,
    };
  }

  return null;
}

export function detectPartnerRoleDrift(
  input: Pick<
    DriftInput,
    | "expectedRoleKeys"
    | "currentRoleIds"
    | "partnerOrgRoleId"
    | "verifyPath"
    | "orgSid"
    | "roleIdToName"
  >,
): DriftFinding[] {
  const findings = detectUnexpectedOrgRolesOnMember(input);
  const staleOrgRole = detectStalePartnerOrgRole(input);

  if (staleOrgRole) {
    findings.push(staleOrgRole);
  }

  return findings;
}

export function mergeDriftFindings(
  findings: DriftFinding[],
): Omit<DriftDetection, "inconclusive"> {
  const driftTypes: DriftType[] = [];
  const issues: string[] = [];

  for (const finding of findings) {
    if (!driftTypes.includes(finding.driftType)) {
      driftTypes.push(finding.driftType);
    }
    issues.push(finding.issue);
  }

  const hasDrift = driftTypes.some((type) => type !== "rsi_unreachable");

  return {
    driftTypes,
    issue:
      issues.length > 0
        ? issues.join("; ")
        : hasDrift
          ? "Role mismatch detected"
          : "",
    hasDrift,
  };
}
