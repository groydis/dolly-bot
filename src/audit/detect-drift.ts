import type { Env } from "../env";
import { isOrgRoleDiscordName } from "../lib/org-symbol";
import type { DriftType } from "./types";

export interface DriftInput {
  verifyPath: "scanz" | "partner";
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

export function detectDrift(env: Env, input: DriftInput): DriftDetection {
  const driftTypes: DriftType[] = [];
  const issues: string[] = [];

  if (input.citizenStatus === 404) {
    return {
      driftTypes: ["profile_gone"],
      issue: "RSI profile not found (404)",
      hasDrift: true,
      inconclusive: false,
    };
  }

  if (input.citizenStatus !== 200) {
    return {
      driftTypes: ["rsi_unreachable"],
      issue: `RSI citizen page returned HTTP ${input.citizenStatus}`,
      hasDrift: false,
      inconclusive: true,
    };
  }

  if (
    input.citizenHandle &&
    input.citizenHandle.toLowerCase() !== input.storedHandle.toLowerCase()
  ) {
    driftTypes.push("handle_mismatch");
    issues.push(
      `RSI handle is \`${input.citizenHandle}\`, stored as \`${input.storedHandle}\``,
    );
  }

  const expectedKeys = new Set(input.expectedRoleKeys);
  const currentRoleIds = new Set(input.currentRoleIds);

  const hasScanz = currentRoleIds.has(env.SCANZ_ROLE_ID);
  const hasVerified = currentRoleIds.has(env.VERIFIED_ROLE_ID);

  if (hasScanz && !expectedKeys.has("scanz")) {
    driftTypes.push("left_org");
    issues.push("Has @SCANZ but RSI no longer grants SCANZ membership");
  }

  if (hasVerified && !expectedKeys.has("verified")) {
    driftTypes.push("lost_verified");
    issues.push("Has @Verified but RSI classification is affiliate-only");
  }

  for (const roleId of currentRoleIds) {
    const roleName = input.roleIdToName.get(roleId);
    if (!roleName || !isOrgRoleDiscordName(roleName)) {
      continue;
    }

    const isExpectedPartnerRole =
      expectedKeys.has("partner_org") &&
      input.partnerOrgRoleId !== null &&
      roleId === input.partnerOrgRoleId;

    if (!isExpectedPartnerRole) {
      if (!driftTypes.includes("left_org")) {
        driftTypes.push("left_org");
      }
      issues.push(`Has partner role @${roleName} but RSI no longer grants it`);
    }
  }

  if (input.verifyPath === "partner" && !expectedKeys.has("partner_org")) {
    if (
      input.partnerOrgRoleId &&
      currentRoleIds.has(input.partnerOrgRoleId)
    ) {
      if (!driftTypes.includes("left_org")) {
        driftTypes.push("left_org");
      }
      issues.push(`Not on ${input.orgSid} roster but still has org role`);
    }
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
    inconclusive: false,
  };
}

export function roleIdsToNames(
  roleIds: readonly string[],
  roleIdToName: Map<string, string>,
): string[] {
  return roleIds
    .map((id) => roleIdToName.get(id) ?? id)
    .filter((name) => name.length > 0);
}
