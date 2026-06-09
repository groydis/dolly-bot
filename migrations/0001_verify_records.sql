CREATE TABLE verify_records (
  discord_user_id     TEXT PRIMARY KEY,
  rsi_handle          TEXT NOT NULL,
  verify_path         TEXT NOT NULL,
  org_sid             TEXT NOT NULL,
  granted_roles       TEXT NOT NULL,
  partner_org_role_id TEXT,
  verified_at         INTEGER NOT NULL,
  last_audited_at     INTEGER,
  updated_at          INTEGER NOT NULL
);

CREATE INDEX idx_verify_records_org ON verify_records(org_sid);
