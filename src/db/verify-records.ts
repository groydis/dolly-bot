export type VerifyPath = "scanz" | "partner";

export interface VerifyRecord {
  discordUserId: string;
  rsiHandle: string;
  verifyPath: VerifyPath;
  orgSid: string;
  grantedRoles: string[];
  partnerOrgRoleId: string | null;
  verifiedAt: number;
  lastAuditedAt: number | null;
  updatedAt: number;
}

interface VerifyRecordRow {
  discord_user_id: string;
  rsi_handle: string;
  verify_path: string;
  org_sid: string;
  granted_roles: string;
  partner_org_role_id: string | null;
  verified_at: number;
  last_audited_at: number | null;
  updated_at: number;
}

function rowToRecord(row: VerifyRecordRow): VerifyRecord {
  return {
    discordUserId: row.discord_user_id,
    rsiHandle: row.rsi_handle,
    verifyPath: row.verify_path as VerifyPath,
    orgSid: row.org_sid,
    grantedRoles: JSON.parse(row.granted_roles) as string[],
    partnerOrgRoleId: row.partner_org_role_id,
    verifiedAt: row.verified_at,
    lastAuditedAt: row.last_audited_at,
    updatedAt: row.updated_at,
  };
}

export interface UpsertVerifyRecordInput {
  discordUserId: string;
  rsiHandle: string;
  verifyPath: VerifyPath;
  orgSid: string;
  grantedRoles: readonly string[];
  partnerOrgRoleId?: string | null;
  verifiedAt?: number;
}

export async function upsertVerifyRecord(
  db: D1Database,
  input: UpsertVerifyRecordInput,
): Promise<void> {
  const now = Date.now();
  const verifiedAt = input.verifiedAt ?? now;

  await db
    .prepare(
      `INSERT INTO verify_records (
        discord_user_id, rsi_handle, verify_path, org_sid, granted_roles,
        partner_org_role_id, verified_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(discord_user_id) DO UPDATE SET
        rsi_handle = excluded.rsi_handle,
        verify_path = excluded.verify_path,
        org_sid = excluded.org_sid,
        granted_roles = excluded.granted_roles,
        partner_org_role_id = excluded.partner_org_role_id,
        verified_at = excluded.verified_at,
        updated_at = excluded.updated_at`,
    )
    .bind(
      input.discordUserId,
      input.rsiHandle,
      input.verifyPath,
      input.orgSid,
      JSON.stringify([...input.grantedRoles]),
      input.partnerOrgRoleId ?? null,
      verifiedAt,
      now,
    )
    .run();
}

export async function getVerifyRecord(
  db: D1Database,
  discordUserId: string,
): Promise<VerifyRecord | null> {
  const row = await db
    .prepare("SELECT * FROM verify_records WHERE discord_user_id = ?")
    .bind(discordUserId)
    .first<VerifyRecordRow>();

  return row ? rowToRecord(row) : null;
}

export async function listAllVerifyRecords(
  db: D1Database,
): Promise<VerifyRecord[]> {
  const result = await db
    .prepare("SELECT * FROM verify_records ORDER BY verified_at ASC")
    .all<VerifyRecordRow>();

  return (result.results ?? []).map(rowToRecord);
}

export async function touchAuditTimestamp(
  db: D1Database,
  discordUserId: string,
  auditedAt: number,
): Promise<void> {
  await db
    .prepare(
      "UPDATE verify_records SET last_audited_at = ?, updated_at = ? WHERE discord_user_id = ?",
    )
    .bind(auditedAt, auditedAt, discordUserId)
    .run();
}
