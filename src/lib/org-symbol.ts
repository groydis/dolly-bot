export const SCANZ_SID = "SCANZ";

const ORG_SYMBOL_PATTERN = /^[A-Za-z0-9_]{2,10}$/;

export function isValidOrgSymbol(input: string): boolean {
  return ORG_SYMBOL_PATTERN.test(input.trim());
}

export function normalizeOrgSymbol(input: string | null | undefined): string {
  if (input == null || input.trim().length === 0) {
    return SCANZ_SID;
  }

  return input.trim().toUpperCase();
}

export function isScanzPath(orgSid: string): boolean {
  return orgSid.toUpperCase() === SCANZ_SID;
}

export function orgRoleName(sid: string): string {
  return `org_${sid.toLowerCase()}`;
}

export function orgChannelName(sid: string): string {
  return sid.toLowerCase();
}

export function isOrgRoleDiscordName(name: string): boolean {
  return name.startsWith("org_");
}
