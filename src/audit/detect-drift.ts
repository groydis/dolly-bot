import type { Env } from "../env";
import {
  detectCitizenStatusDrift,
  detectHandleMismatchDrift,
  detectPartnerRoleDrift,
  detectScanzRoleDrift,
  mergeDriftFindings,
} from "./drift-predicates";
import type { DriftDetection, DriftInput } from "./types";

export type { DriftDetection, DriftInput } from "./types";

export function detectDrift(env: Env, input: DriftInput): DriftDetection {
  const statusResult = detectCitizenStatusDrift(input.citizenStatus);
  if (statusResult) {
    return statusResult;
  }

  const findings = [
    detectHandleMismatchDrift(input),
    ...detectScanzRoleDrift(env, input),
    ...detectPartnerRoleDrift(input),
  ].filter((finding): finding is NonNullable<typeof finding> => finding !== null);

  return {
    ...mergeDriftFindings(findings),
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
