import type { DiscordRole } from "../discord/types";

export function buildRoleIdToNameMap(roles: DiscordRole[]): Map<string, string> {
  return new Map(roles.map((role) => [role.id, role.name]));
}

export function roleMapToRecord(
  map: Map<string, string>,
): Record<string, string> {
  return Object.fromEntries(map);
}

export function roleMapFromRecord(
  record: Record<string, string>,
): Map<string, string> {
  return new Map(Object.entries(record));
}
