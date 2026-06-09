import type { GuildMember } from "../discord/types";
import type { AppError } from "../errors";
import { isStaffMember } from "../config/staff-roles";
import { err, ok, type Result } from "../lib/result";

export function requireStaffRole(
  member: GuildMember | undefined,
): Result<void, AppError> {
  if (!member) {
    return err({ code: "MISSING_STAFF_ROLE" });
  }

  if (!isStaffMember(member.roles)) {
    return err({ code: "MISSING_STAFF_ROLE" });
  }

  return ok(undefined);
}
