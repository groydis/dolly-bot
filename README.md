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
├── guards/               # Reusable validation (guild, role, voice)
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
| `DEFAULT_PING_CHANNEL_ID` | Default channel for activity pings |

Activity role IDs are configured in [`src/config/activities.ts`](src/config/activities.ts).

Do not commit `.dev.vars` or secrets.

## Discord app setup

1. Create a Discord application at [discord.com/developers](https://discord.com/developers/applications)
2. Create a bot user and copy the **Application ID**, **Public Key**, and **Bot Token**
3. Invite the bot to the SCANZ server with these permissions:
   - View Channels
   - Send Messages
   - Connect (required to detect which voice channel you're in)
   - Mention @everyone, @here, and All Roles
   - `applications.commands` scope (via invite URL, not a guild permission)

   Generate a SCANZ-only invite link: `npm run invite:url`
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
wrangler secret put DEFAULT_PING_CHANNEL_ID
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

## MVP limitations

- Single guild only (other guilds are rejected)
- SCANZ role required to use `/ping`
- No cooldowns
- No persistent storage
- No admin dashboard
- No auto-cleanup of old pings
- Guild-scoped slash commands only

## Future improvements

- Cooldowns via Cloudflare KV (per-user and per-activity)
- Per-activity target channels (already supported in config shape)
- Additional slash commands via the command registry
- Admin logging channel
- Rich embed formatting
- Scheduled ping cleanup

## Health check

```bash
curl https://dolly-bot.scanz.space/
```

Returns: `SCANZ activity ping bot is running.`
