/** Admin and Custodian roles — staff commands and ping cooldown bypass. */
export const STAFF_ROLE_IDS: readonly string[] = [
  "1275018285100044339", // Admin
  "1443042599681392660", // Custodian
];

export function isStaffMember(roles: readonly string[] | undefined): boolean {
  if (!roles) {
    return false;
  }

  return STAFF_ROLE_IDS.some((roleId) => roles.includes(roleId));
}
