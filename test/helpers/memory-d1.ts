import type { VerifyRecord } from "../../src/db/verify-records";

export type MemoryD1 = D1Database & {
  records: Map<string, VerifyRecord>;
};

function recordToRow(record: VerifyRecord) {
  return {
    discord_user_id: record.discordUserId,
    rsi_handle: record.rsiHandle,
    verify_path: record.verifyPath,
    org_sid: record.orgSid,
    granted_roles: JSON.stringify(record.grantedRoles),
    partner_org_role_id: record.partnerOrgRoleId,
    verified_at: record.verifiedAt,
    last_audited_at: record.lastAuditedAt,
    updated_at: record.updatedAt,
  };
}

export function createMemoryD1(): MemoryD1 {
  const records = new Map<string, VerifyRecord>();

  const db = {
    records,
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        run: async () => {
          if (!sql.includes("verify_records")) {
            return { success: true, meta: {} };
          }

          if (sql.trimStart().toUpperCase().startsWith("UPDATE")) {
            const [auditedAt, updatedAt, discordUserId] = args as [
              number,
              number,
              string,
            ];
            const existing = records.get(discordUserId);
            if (existing) {
              records.set(discordUserId, {
                ...existing,
                lastAuditedAt: auditedAt,
                updatedAt,
              });
            }

            return { success: true, meta: {} };
          }

          const [
            discordUserId,
            rsiHandle,
            verifyPath,
            orgSid,
            grantedRolesJson,
            partnerOrgRoleId,
            verifiedAt,
            updatedAt,
          ] = args as [
            string,
            string,
            string,
            string,
            string,
            string | null,
            number,
            number,
          ];

          records.set(discordUserId, {
            discordUserId,
            rsiHandle,
            verifyPath: verifyPath as VerifyRecord["verifyPath"],
            orgSid,
            grantedRoles: JSON.parse(grantedRolesJson) as string[],
            partnerOrgRoleId,
            verifiedAt,
            lastAuditedAt: records.get(discordUserId)?.lastAuditedAt ?? null,
            updatedAt,
          });

          return { success: true, meta: {} };
        },
        first: async () => {
          const discordUserId = args[0] as string;
          const record = records.get(discordUserId);
          return record ? recordToRow(record) : null;
        },
        all: async () => ({
          results: [...records.values()].map(recordToRow),
        }),
      }),
    }),
    batch: async () => [],
    exec: async () => ({ count: 0, duration: 0 }),
    dump: async () => new ArrayBuffer(0),
    withSession: () => db,
  };

  return db as unknown as MemoryD1;
}
