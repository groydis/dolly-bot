const EVERYONE_HERE_PATTERN =
  /@(everyone|here)|<@&(?:everyone|here)>/gi;
const ROLE_MENTION_PATTERN = /<@&(\d+)>/g;

export function sanitizeDescription(
  description: string | undefined,
  allowedRoleIds: ReadonlySet<string>,
): string | undefined {
  if (!description) {
    return undefined;
  }

  let sanitized = description.replace(EVERYONE_HERE_PATTERN, "");

  sanitized = sanitized.replace(ROLE_MENTION_PATTERN, (match, roleId: string) => {
    return allowedRoleIds.has(roleId) ? match : "";
  });

  sanitized = sanitized.trim();
  return sanitized.length > 0 ? sanitized : undefined;
}

export function buildAllowedRoleIdSet(roleIds: readonly string[]): ReadonlySet<string> {
  return new Set(roleIds);
}
