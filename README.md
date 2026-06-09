# Dolly Bot — SCANZ Activity Ping Bot

A lightweight Discord bot built on Cloudflare Workers. Dolly Bot provides the **SCANZ Activity Ping** feature: members with the SCANZ role can use `/ping` to summon activity roles to their voice channel.

## What it does

`/ping` lets a SCANZ member:

1. Pick an activity (Mining, Salvage, Hauling, etc.)
2. Optionally add a short description
3. Post a public ping to the configured activity channel
4. Mention the correct activity role and link to their current voice channel

The command only works when the user is in a regular voice channel (not AFK or a stage channel).

## Architecture

The Worker uses a command-handler pattern designed for extension:

```
src/
├── index.ts              # HTTP entry, signature verify, dispatch
├── commands/
│   ├── registry.ts       # Command definitions + handler map
│   ├── execute.ts        # Shared guards, defer follow-up orchestration
│   └── ping/             # /ping command module
├── guards/               # Reusable validation (guild, role, voice, staff)
├── audit/                # RSI drift checks, CSV export, scheduled audit
├── db/                   # D1 verify record storage
├── discord/              # Verification, interactions, REST API client
├── config/activities.ts  # Activity → role mapping
└── lib/                  # Pure helpers (result, options, sanitize)
```

**Adding a new command later:**

1. Create `src/commands/<name>/` with `definition.ts`, `handler.ts`, and any format/helpers
2. Register it in `src/commands/registry.ts`
3. Run `npm run register:commands`

Shared guards (guild membership, SCANZ role) run automatically for all commands.

## Environment variables

Copy `.env.example` to `.dev.vars` (for `wrangler dev`) or `.env` (for `register:commands`):

| Variable | Description |
|----------|-------------|
| `DISCORD_PUBLIC_KEY` | Application public key (Interactions verification) |
| `DISCORD_APPLICATION_ID` | Discord application ID |
| `DISCORD_BOT_TOKEN` | Bot token |
| `DISCORD_GUILD_ID` | SCANZ server guild ID |
| `SCANZ_ROLE_ID` | Role ID required to use `/ping` |
| `VERIFIED_ROLE_ID` | Verified role assigned by `/verify` |
| `AFFILIATE_ROLE_ID` | Affiliate role assigned by `/verify` |
| `DEFAULT_PING_CHANNEL_ID` | Default channel for activity pings |
| `PARTNER_ORG_CATEGORY_ID` | Category for auto-created partner org text channels |
| `AUDIT_CHANNEL_ID` | Private staff channel for weekly verify drift reports |

Activity role IDs are configured in [`src/config/activities.ts`](src/config/activities.ts).

Do not commit `.dev.vars` or secrets.

## Discord app setup

1. Create a Discord application at [discord.com/developers](https://discord.com/developers/applications)
2. Create a bot user and copy the **Application ID**, **Public Key**, and **Bot Token**
3. Invite the bot to the SCANZ server with these permissions:
   - View Channels
   - Send Messages
   - Connect (required to detect which voice channel you're in)
   - Create Public Threads + Send Messages in Threads (discussion threads on pings)
   - Mention @everyone, @here, and All Roles
   - Manage Roles + Manage Nicknames + Manage Channels (required for `/verify` and partner org channels)
   - `applications.commands` scope (via invite URL, not a guild permission)

   Generate a SCANZ-only invite link: `npm run invite:url` (re-run after permission changes). Place the bot role **above** SCANZ, Verified, and Affiliate roles.
4. Deploy the Worker and set the **Interactions Endpoint URL** to:

   ```
   https://dolly-bot.scanz.space
   ```
5. Fill in `src/config/activities.ts` with real role IDs
6. Register slash commands: `npm run register:commands`

## Local development

```bash
npm install
cp .env.example .dev.vars
# Edit .dev.vars with your values

npm run dev
```

Use a tunnel (e.g. Cloudflare Tunnel or ngrok) to expose your local Worker URL to Discord for interaction testing.

## Deployment

```bash
npm run deploy
```

Set secrets in the Cloudflare dashboard or via Wrangler:

```bash
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_APPLICATION_ID
wrangler secret put DISCORD_BOT_TOKEN
wrangler secret put DISCORD_GUILD_ID
wrangler secret put SCANZ_ROLE_ID
wrangler secret put VERIFIED_ROLE_ID
wrangler secret put AFFILIATE_ROLE_ID
wrangler secret put DEFAULT_PING_CHANNEL_ID
wrangler secret put PARTNER_ORG_CATEGORY_ID
wrangler secret put AUDIT_CHANNEL_ID
```

After deploying, set the Discord Interactions Endpoint URL to `https://dolly-bot.scanz.space` and run `npm run register:commands`.

**Production URL:** https://dolly-bot.scanz.space  
(Workers.dev fallback: `https://dolly-bot.greydenscott.workers.dev`)

## Command registration

Commands are registered to a single guild for fast updates during development:

```bash
npm run register:commands
```

Requires `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN`, and `DISCORD_GUILD_ID` in the environment (or `.dev.vars` when using `wrangler dev`).

## Configuring activities

Edit [`src/config/activities.ts`](src/config/activities.ts):

```ts
miners: {
  label: "Miners",
  roleId: "123456789012345678",
  // targetChannelId: "optional-per-activity-channel",
},
```

Activity choices are derived from `ACTIVITIES` — edit that file only; slash command choices update automatically when you re-run `register:commands`.

Redeploy after changing config. Re-run `register:commands` only if command options change.

## Discussion threads

Each successful `/ping` automatically creates a public thread on the ping message named `{Activity} discussion`, with an opening message: *"Please discuss here..."*

If thread creation fails (e.g. missing permissions), the ping still goes through.

## RSI verification (`/verify`)

Members can verify their RSI account without already having the SCANZ role.

### SCANZ verify (default)

1. Run `/verify handle:Your_RSI_Handle` (or `org:SCANZ`)
2. Add the shown `[SCANZ: …]` code to their RSI bio
3. Click **Verify** on the ephemeral message

The bot checks RSI, assigns roles (SCANZ / Verified / Affiliate per membership), and sets their Discord nickname to their handle.

If SCANZ membership cannot be confirmed, they receive **Affiliate** only with guidance to apply to SCANZ or re-run with their partner org.

### Partner org verify

1. Run `/verify handle:Your_RSI_Handle org:ZAP` (any valid RSI org symbol)
2. Add `[ZAP: …]` (matching the org) to their RSI bio
3. Click **Verify**

On success: **Affiliate** + **Verified** + dynamically created `@org_zap`, nickname `[ZAP] Handle`, and private channel `#zap` under `PARTNER_ORG_CATEGORY_ID`.

If org roster membership cannot be confirmed: **Affiliate** only with a message to double-check the org symbol.

Re-invite the bot after permission changes (`npm run invite:url`). Place the bot role **above** dynamically created `org_*` roles.

## Verify audit (`/audit`)

Staff (Admin / Custodian) can re-check RSI membership against Discord roles. The bot **never removes roles automatically** — it reports drift for manual review.

### How it works

1. Successful `/verify` stores a row in **D1** (`discord user → RSI handle, org, roles granted`).
2. **Weekly cron** (Monday 06:00 UTC) re-checks all records against RSI and posts drift cases to `AUDIT_CHANNEL_ID`.
3. Each run writes a **full CSV** to **R2** (`dolly-bot-audits` bucket) for spreadsheet review.
4. `/audit` runs the same check on demand; `/audit user:@Someone` checks one member.

### Staff command

```
/audit              # audit everyone, post drift to audit channel
/audit user:@Member # audit one member (ephemeral result)
```

### Backfill existing members

For members verified before D1 tracking:

```bash
npm run backfill:verify-records
npx wrangler d1 execute dolly-bot-verify --remote --file=backfill-verify-records.sql
```

Use `--dry-run` to preview counts without writing SQL.

### Audit setup (deploy)

1. D1 and R2 are configured in `wrangler.toml` (created via Wrangler).
2. Apply migrations: `npx wrangler d1 migrations apply dolly-bot-verify --remote`
3. Set secret: `wrangler secret put AUDIT_CHANNEL_ID`
4. Deploy and `npm run register:commands`

Download CSV from Cloudflare R2 dashboard or:

```bash
npx wrangler r2 object get dolly-bot-audits audits/YYYY-MM-DD/weekly-HH-mmZ.csv --file report.csv
```

## Cooldowns

`/ping` has a **5-minute per-user cooldown** stored in Cloudflare KV.

**Exempt roles** (no cooldown) are configured in [`src/config/staff-roles.ts`](src/config/staff-roles.ts):

- Admin (`1275018285100044339`)
- Custodian (`1443042599681392660`)

## MVP limitations

- Single guild only (other guilds are rejected)
- SCANZ role required to use `/ping`
- Verify audit does not auto-remove roles (manual review only)
- No auto-cleanup of old pings or audit CSV files
- Guild-scoped slash commands only

## Future improvements

- Per-activity cooldowns
- Per-activity target channels (already supported in config shape)
- Rich embed formatting
- Scheduled ping cleanup
- R2 lifecycle rules for old audit CSVs

## Health check

```bash
curl https://dolly-bot.scanz.space/
```

Returns: `SCANZ activity ping bot is running.`
