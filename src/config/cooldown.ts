export const PING_COOLDOWN_SECONDS = 5 * 60;

/** Admin and Custodian roles bypass /ping cooldowns. */
export const COOLDOWN_EXEMPT_ROLE_IDS: readonly string[] = [
  "1275018285100044339", // Admin
  "1443042599681392660", // Custodian
];

export function isCooldownExempt(roles: readonly string[] | undefined): boolean {
  if (!roles) {
    return false;
  }

  return COOLDOWN_EXEMPT_ROLE_IDS.some((roleId) => roles.includes(roleId));
}
