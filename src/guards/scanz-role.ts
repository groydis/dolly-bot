import type { AppError } from "../errors";
import type { GuildMember } from "../discord/types";
import { err, ok, type Result } from "../lib/result";

export function requireScanzRole(
  member: GuildMember | undefined,
  scanzRoleId: string,
): Result<GuildMember, AppError> {
  if (!member) {
    return err({ code: "MISSING_SCANZ_ROLE" });
  }

  if (!member.roles.includes(scanzRoleId)) {
    return err({ code: "MISSING_SCANZ_ROLE" });
  }

  return ok(member);
}

export function requireVerifiedScanzRoles(
  member: GuildMember | undefined,
  scanzRoleId: string,
  verifiedRoleId: string,
): Result<GuildMember, AppError> {
  if (!member) {
    return err({ code: "MISSING_SCANZ_ROLE" });
  }

  const hasScanz = member.roles.includes(scanzRoleId);
  const hasVerified = member.roles.includes(verifiedRoleId);

  if (!hasScanz || !hasVerified) {
    return err({ code: "MISSING_SCANZ_ROLE" });
  }

  return ok(member);
}
