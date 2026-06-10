/**
 * Backfills the `verify_records` table for members who were verified before
 * the bot started persisting records. Scans every guild member, infers their
 * verify path, RSI handle, org, and granted roles from their existing Discord
 * roles and nickname, and writes the matching SQL INSERTs to
 * `backfill-verify-records.sql` for you to apply against the D1 database.
 * Skips staff and members that don't qualify. Pass `--dry-run` to print the
 * summary without writing the file.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { STAFF_ROLE_IDS } from "../src/config/staff-roles";
import { createDiscordApiClient } from "../src/discord/api";
import type { DiscordGuildMember, DiscordRole } from "../src/discord/types";
import { loadLocalEnv } from "../src/lib/load-env";
import { isOrgRoleDiscordName } from "../src/lib/org-symbol";
import { parseVerifyNickname } from "../src/lib/parse-verify-nickname";

loadLocalEnv(resolve(__dirname, ".."));

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function memberQualifies(
  member: DiscordGuildMember,
  roleIds: {
    scanzRoleId: string;
    verifiedRoleId: string;
    orgRoleIds: Set<string>;
  },
): boolean {
  const roles = new Set(member.roles);

  if (roles.has(roleIds.verifiedRoleId) || roles.has(roleIds.scanzRoleId)) {
    return true;
  }

  for (const orgRoleId of roleIds.orgRoleIds) {
    if (roles.has(orgRoleId)) {
      return true;
    }
  }

  return false;
}

function inferGrantedRoles(
  member: DiscordGuildMember,
  parsed: ReturnType<typeof parseVerifyNickname>,
  roleIds: {
    scanzRoleId: string;
    verifiedRoleId: string;
    affiliateRoleId: string;
    orgRoleIds: Map<string, string>;
  },
): { grantedRoles: string[]; partnerOrgRoleId: string | null } {
  const roles = new Set(member.roles);
  const granted: string[] = [];

  if (roles.has(roleIds.scanzRoleId)) {
    granted.push("scanz");
  }

  if (roles.has(roleIds.verifiedRoleId)) {
    granted.push("verified");
  }

  if (roles.has(roleIds.affiliateRoleId)) {
    granted.push("affiliate");
  }

  let partnerOrgRoleId: string | null = null;

  if (parsed?.verifyPath === "partner") {
    for (const [roleId, roleName] of roleIds.orgRoleIds) {
      if (roles.has(roleId)) {
        partnerOrgRoleId = roleId;
        if (!granted.includes("partner_org")) {
          granted.push("partner_org");
        }
        break;
      }
    }
  }

  if (granted.length === 0) {
    granted.push("affiliate");
  }

  return { grantedRoles: granted, partnerOrgRoleId };
}

async function listAllMembers(
  api: ReturnType<typeof createDiscordApiClient>,
  guildId: string,
): Promise<DiscordGuildMember[]> {
  const members: DiscordGuildMember[] = [];
  let after: string | undefined;

  for (;;) {
    const page = await api.listGuildMembers(guildId, after);
    members.push(...page);

    if (page.length < 1000) {
      break;
    }

    after = page[page.length - 1]?.user.id;
    if (!after) {
      break;
    }
  }

  return members;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const guildId = requireEnv("DISCORD_GUILD_ID");
  const scanzRoleId = requireEnv("SCANZ_ROLE_ID");
  const verifiedRoleId = requireEnv("VERIFIED_ROLE_ID");
  const affiliateRoleId = requireEnv("AFFILIATE_ROLE_ID");

  const env = {
    DISCORD_BOT_TOKEN: requireEnv("DISCORD_BOT_TOKEN"),
  } as Parameters<typeof createDiscordApiClient>[0];

  const api = createDiscordApiClient(env);
  const guildRoles = await api.listGuildRoles(guildId);
  const orgRoles = guildRoles.filter((role: DiscordRole) =>
    isOrgRoleDiscordName(role.name),
  );
  const orgRoleIds = new Map(orgRoles.map((role) => [role.id, role.name]));

  const roleFilter = {
    scanzRoleId,
    verifiedRoleId,
    affiliateRoleId,
    orgRoleIds,
  };

  const members = await listAllMembers(api, guildId);
  const statements: string[] = [];
  let inserted = 0;
  let skipped = 0;
  let unparseable = 0;

  for (const member of members) {
    if (STAFF_ROLE_IDS.some((id) => member.roles.includes(id))) {
      skipped++;
      continue;
    }

    if (
      !memberQualifies(member, {
        scanzRoleId,
        verifiedRoleId,
        orgRoleIds: new Set(orgRoleIds.keys()),
      })
    ) {
      continue;
    }

    const displayNick = member.nick ?? member.user.username;
    const parsed = parseVerifyNickname(member.nick);

    if (!parsed) {
      console.warn("Unparseable nickname", {
        userId: member.user.id,
        nick: displayNick,
      });
      unparseable++;
      continue;
    }

    const { grantedRoles, partnerOrgRoleId } = inferGrantedRoles(
      member,
      parsed,
      roleFilter,
    );

    const sql = `INSERT INTO verify_records (
  discord_user_id, rsi_handle, verify_path, org_sid, granted_roles,
  partner_org_role_id, verified_at, updated_at
) VALUES (
  ${sqlString(member.user.id)},
  ${sqlString(parsed.rsiHandle)},
  ${sqlString(parsed.verifyPath)},
  ${sqlString(parsed.orgSid)},
  ${sqlString(JSON.stringify(grantedRoles))},
  ${partnerOrgRoleId ? sqlString(partnerOrgRoleId) : "NULL"},
  0,
  ${Date.now()}
)
ON CONFLICT(discord_user_id) DO UPDATE SET
  rsi_handle = excluded.rsi_handle,
  verify_path = excluded.verify_path,
  org_sid = excluded.org_sid,
  granted_roles = excluded.granted_roles,
  partner_org_role_id = excluded.partner_org_role_id,
  updated_at = excluded.updated_at;`;

    statements.push(sql);
    inserted++;
  }

  const outputPath = resolve(__dirname, "..", "backfill-verify-records.sql");
  const fileContents = statements.join("\n\n");

  if (!dryRun) {
    writeFileSync(outputPath, fileContents, "utf8");
  }

  console.log("Backfill summary", {
    dryRun,
    membersScanned: members.length,
    recordsGenerated: inserted,
    skippedStaff: skipped,
    unparseable,
    outputPath: dryRun ? "(not written)" : outputPath,
  });

  if (!dryRun && inserted > 0) {
    console.log(
      "\nApply with:\n  npx wrangler d1 execute dolly-bot-verify --remote --file=backfill-verify-records.sql",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
