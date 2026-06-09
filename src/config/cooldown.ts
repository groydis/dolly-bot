import { isStaffMember } from "./staff-roles";

export const PING_COOLDOWN_SECONDS = 5 * 60;

export function isCooldownExempt(roles: readonly string[] | undefined): boolean {
  return isStaffMember(roles);
}
