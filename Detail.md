# Build Guide: SCANZ Discord `/ping` Activity Bot MVP

Build a lightweight Discord bot using **Cloudflare Workers** and Discord HTTP Interactions.

The bot should provide one slash command:

```txt
/ping activity description
```

Example:

```txt
/ping activity:mining description:"Need a Mole crew for some chill rocks"
```

The bot should:

1. Receive the slash command from Discord.
2. Check whether the user is currently in a voice channel.
3. If the user is **not** in a voice channel, reply privately/ephemerally with an error.
4. If the user **is** in a voice channel, post an activity ping message to a configured Discord channel.
5. Mention the correct Discord role for the selected activity.
6. Include a clickable voice channel mention so people know where to join.
7. Reply privately/ephemerally to the command user confirming the ping was sent.

---

## Tech stack

Use:

* Cloudflare Workers
* TypeScript
* Wrangler
* Discord HTTP Interactions
* Discord REST API
* No database for MVP
* No Discord Gateway connection
* No discord.js bot process

This should be a request-based Worker, not an always-running bot.

---

## Project goals

Create a minimal, clean MVP that can be deployed quickly.

The MVP should be easy to extend later with:

* More activities
* Cooldowns
* Per-activity target channels
* Admin logging
* Better formatting
* Permission checks
* Scheduled cleanup

But do not overbuild v1.

---

## Required behaviour

### Slash command

Create/register a Discord global or guild slash command named:

```txt
ping
```

Command description:

```txt
Ping an activity role and invite people to join your voice channel.
```

Options:

### `activity`

Required string option.

Use choices rather than free text.

Initial choices:

```txt
mining
salvage
hauling
industry
fleetops
pvp
pve
fps
general
```

Labels can be user-facing with title case:

```txt
Mining
Salvage
Hauling
Industry
Fleet Ops
PVP
PVE
FPS
General
```

Values should be lowercase machine-safe strings:

```txt
mining
salvage
hauling
industry
fleetops
pvp
pve
fps
general
```

### `description`

Optional string option.

Description:

```txt
Optional details about what you are doing.
```

Limit this to something sensible, around 500 characters.

User-supplied descriptions allow Discord markdown. Sanitize before posting:

* Strip `@everyone` and `@here` (plain and mention forms)
* Allow role mentions only for configured activity roles and the SCANZ role
* Remove unauthorized `<@&ROLE_ID>` mentions

---

## Discord message behaviour

When a user runs:

```txt
/ping activity:mining description:"Need Mole crew around Stanton"
```

The bot should:

1. Check if the user is in a voice channel.
2. Find the activity config for `mining`.
3. Post a message to the configured ping channel.

Example public message:

```md
<@&MINING_ROLE_ID>

**Mining ping started by <@USER_ID>**

Need Mole crew around Stanton.

Join them in <#VOICE_CHANNEL_ID> to jump in.
```

If no description is provided:

```md
<@&MINING_ROLE_ID>

**Mining ping started by <@USER_ID>**

Join them in <#VOICE_CHANNEL_ID> to jump in.
```

The message must use Discord role mention format:

```txt
<@&ROLE_ID>
```

The voice channel mention must use:

```txt
<#CHANNEL_ID>
```

---

## Error behaviour

If the command is used outside the configured guild (including DMs), do not post a public ping.

Reply ephemerally:

```txt
This command only works inside the SCANZ server.
```

If the interaction is from a different guild:

```txt
This bot only works in the SCANZ server.
```

If the user does not have the SCANZ role:

```txt
You need the SCANZ role to use /ping.
```

If the user is not in a voice channel, do not post a public ping.

Reply ephemerally:

```txt
You need to be in a voice channel before using /ping.

Jump into a VC first, then run the command again so people know where to join you.
```

If the user is in an AFK or stage channel:

```txt
You need to be in an active voice channel (not AFK or a stage) before using /ping.

Join a regular voice channel, then run the command again.
```

If the selected activity does not exist in config:

```txt
That activity is not configured yet.
```

If the bot cannot post to the target channel:

```txt
I could not send the ping. Please check my channel permissions.
```

If Discord voice-state lookup fails unexpectedly:

```txt
I could not check your voice channel. Please try again in a moment.
```

On success, reply ephemerally:

```txt
Mining ping sent!
```

(Use the activity label in place of "Mining".)

All command responses to the user should be ephemeral.

---

## Config

Create a config file, for example:

```ts
// src/config/activities.ts

export type ActivityKey =
  | "mining"
  | "salvage"
  | "hauling"
  | "industry"
  | "fleetops"
  | "pvp"
  | "pve"
  | "fps"
  | "general";

export const ACTIVITIES: Record<ActivityKey, {
  label: string;
  roleId: string;
  targetChannelId?: string;
}> = {
  mining: {
    label: "Mining",
    roleId: "REPLACE_WITH_MINING_ROLE_ID",
  },
  salvage: {
    label: "Salvage",
    roleId: "REPLACE_WITH_SALVAGE_ROLE_ID",
  },
  hauling: {
    label: "Hauling",
    roleId: "REPLACE_WITH_HAULING_ROLE_ID",
  },
  industry: {
    label: "Industry",
    roleId: "REPLACE_WITH_INDUSTRY_ROLE_ID",
  },
  fleetops: {
    label: "Fleet Ops",
    roleId: "REPLACE_WITH_FLEETOPS_ROLE_ID",
  },
  pvp: {
    label: "PVP",
    roleId: "REPLACE_WITH_PVP_ROLE_ID",
  },
  pve: {
    label: "PVE",
    roleId: "REPLACE_WITH_PVE_ROLE_ID",
  },
  fps: {
    label: "FPS",
    roleId: "REPLACE_WITH_FPS_ROLE_ID",
  },
  general: {
    label: "General",
    roleId: "REPLACE_WITH_GENERAL_ACTIVITY_ROLE_ID",
  },
};
```

Use a default target ping channel from env:

```txt
DEFAULT_PING_CHANNEL_ID
```

If an activity has `targetChannelId`, use that.

Otherwise use `DEFAULT_PING_CHANNEL_ID`.

This allows v1 to use one activity ping channel, while making per-activity channels easy later.

---

## Environment variables / secrets

The Worker needs:

```txt
DISCORD_PUBLIC_KEY
DISCORD_APPLICATION_ID
DISCORD_BOT_TOKEN
DISCORD_GUILD_ID
SCANZ_ROLE_ID
DEFAULT_PING_CHANNEL_ID
```

For local dev, use `.dev.vars`.

Do not commit `.dev.vars`.

See `.env.example` for a template.

Example:

```txt
DISCORD_PUBLIC_KEY="..."
DISCORD_APPLICATION_ID="..."
DISCORD_BOT_TOKEN="..."
DISCORD_GUILD_ID="..."
SCANZ_ROLE_ID="..."
DEFAULT_PING_CHANNEL_ID="..."
```

For deployed Workers, set secrets via Wrangler or the Cloudflare dashboard.

---

## Worker structure

Implemented structure:

```txt
.
├─ package.json
├─ wrangler.toml
├─ tsconfig.json
├─ .env.example
├─ scripts/
│  └─ register-commands.ts
└─ src/
   ├─ index.ts
   ├─ env.ts
   ├─ errors.ts
   ├─ config/
   │  └─ activities.ts
   ├─ commands/
   │  ├─ registry.ts
   │  ├─ execute.ts
   │  ├─ types.ts
   │  └─ ping/
   │     ├─ definition.ts
   │     ├─ handler.ts
   │     └─ format.ts
   ├─ guards/
   │  ├─ guild.ts
   │  ├─ scanz-role.ts
   │  └─ voice.ts
   ├─ discord/
   │  ├─ api.ts
   │  ├─ interactions.ts
   │  ├─ types.ts
   │  └─ verify.ts
   └─ lib/
      ├─ result.ts
      ├─ options.ts
      └─ sanitize.ts
```

---

## Core Worker flow

In `src/index.ts`:

1. Only accept `POST` requests for Discord interactions.
2. Verify the Discord request signature using:

   * `x-signature-ed25519`
   * `x-signature-timestamp`
   * raw request body
   * `DISCORD_PUBLIC_KEY`
3. Reject invalid signatures with `401`.
4. Parse JSON body.
5. Handle Discord `PING` interaction by returning `{ type: 1 }`.
6. Handle application command interactions.
7. Only support command name `ping`.
8. Extract:

   * `guild_id`
   * `member.user.id`
   * `data.options`
   * `activity`
   * `description`
9. Validate activity exists in config.
10. Return a deferred ephemeral response immediately (`type: 5`, `flags: 64`).
11. Continue processing in `waitUntil`:
    * Validate guild (`guild_id` must match `DISCORD_GUILD_ID`)
    * Validate SCANZ role (`SCANZ_ROLE_ID` in `member.roles`)
    * Check user voice state via Discord REST: `GET /api/v10/guilds/{guild_id}/voice-states/{user_id}`
    * Reject AFK and stage channels
12. If no voice state or no `channel_id`, follow up with ephemeral error.
13. Sanitize optional description (strip `@everyone`/`@here`; allow only activity + SCANZ role mentions).
14. Send public message to the configured target channel.
15. Follow up with ephemeral success via interaction webhook (`PATCH .../messages/@original`).

---

## Discord signature verification

Use an existing package if it works cleanly with Cloudflare Workers.

Preferred:

```txt
discord-interactions
```

If compatibility is annoying, implement verification using a small Ed25519-compatible library that works in Cloudflare Workers.

The verification must use the raw body, not a re-stringified JSON object.

Pseudo-flow:

```ts
const signature = request.headers.get("x-signature-ed25519");
const timestamp = request.headers.get("x-signature-timestamp");
const body = await request.text();

const isValid = verifyDiscordRequest(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);

if (!isValid) {
  return new Response("Bad request signature", { status: 401 });
}

const interaction = JSON.parse(body);
```

---

## Interaction response helpers

Create helpers for:

```ts
jsonResponse(data: unknown, status = 200)
ephemeral(content: string)
publicResponse(content: string)
```

Ephemeral interaction response should use Discord message flags:

```ts
flags: 64
```

Example:

```ts
function ephemeral(content: string) {
  return {
    type: 4,
    data: {
      content,
      flags: 64,
      allowed_mentions: {
        parse: [],
      },
    },
  };
}
```

---

## Voice state lookup

Create:

```ts
async function getUserVoiceChannelId(env, guildId: string, userId: string): Promise<string | null>
```

It should call:

```txt
GET https://discord.com/api/v10/guilds/{guildId}/voice-states/{userId}
```

Use header:

```txt
Authorization: Bot ${env.DISCORD_BOT_TOKEN}
```

Behaviour:

* If `200`, parse JSON and return `channel_id` if present.
* If `404`, return null.
* For other errors, throw or return a typed error.

---

## Posting the activity ping

Create:

```ts
async function postActivityPing(params: {
  env: Env;
  channelId: string;
  roleId: string;
  userId: string;
  voiceChannelId: string;
  activityLabel: string;
  description?: string;
})
```

POST to:

```txt
https://discord.com/api/v10/channels/{channelId}/messages
```

Body:

```ts
{
  content,
  allowed_mentions: {
    roles: [roleId],
    users: [userId],
    parse: ["channels"]
  }
}
```

Important:

Do not use unrestricted `allowed_mentions.parse` for roles or users.

Only allow the exact role ID and user ID being mentioned. Use `parse: ["channels"]` so dynamically created voice channels can be mentioned.

Message format:

If description exists:

```md
<@&ROLE_ID>

**ACTIVITY_LABEL ping started by <@USER_ID>**

DESCRIPTION

Join them in <#VOICE_CHANNEL_ID> to jump in.
```

If no description:

```md
<@&ROLE_ID>

**ACTIVITY_LABEL ping started by <@USER_ID>**

Join them in <#VOICE_CHANNEL_ID> to jump in.
```

---

## Register command script

Create `scripts/register-commands.ts`.

It should register the `/ping` command with Discord.

Support guild registration first because it updates faster during testing.

Use env vars:

```txt
DISCORD_APPLICATION_ID
DISCORD_BOT_TOKEN
DISCORD_GUILD_ID
```

(`DISCORD_GUILD_ID` is also required by the Worker at runtime.)

For MVP, register to one guild:

```txt
PUT /applications/{application.id}/guilds/{guild.id}/commands
```

The command payload should be:

```json
[
  {
    "name": "ping",
    "description": "Ping an activity role and invite people to join your voice channel.",
    "type": 1,
    "options": [
      {
        "name": "activity",
        "description": "The activity you want to ping.",
        "type": 3,
        "required": true,
        "choices": [
          { "name": "Mining", "value": "mining" },
          { "name": "Salvage", "value": "salvage" },
          { "name": "Hauling", "value": "hauling" },
          { "name": "Industry", "value": "industry" },
          { "name": "Fleet Ops", "value": "fleetops" },
          { "name": "PVP", "value": "pvp" },
          { "name": "PVE", "value": "pve" },
          { "name": "FPS", "value": "fps" },
          { "name": "General", "value": "general" }
        ]
      },
      {
        "name": "description",
        "description": "Optional details about what you are doing.",
        "type": 3,
        "required": false,
        "max_length": 500
      }
    ]
  }
]
```

Add npm script:

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "register:commands": "tsx scripts/register-commands.ts"
  }
}
```

---

## Discord app setup

Document these setup steps in the README:

1. Create Discord application.
2. Create bot user.
3. Copy application ID.
4. Copy public key.
5. Copy bot token.
6. Add bot to server with required permissions.
7. Set Interactions Endpoint URL to the deployed Worker URL.
8. Register slash command.
9. Test `/ping`.

Required bot permissions:

```txt
View Channels
Send Messages
Use Slash Commands
Mention @everyone, @here, and All Roles
```

The bot needs the ability to mention roles, but the code must restrict allowed mentions to configured role IDs only.

---

## MVP permission assumptions

For v1, only members with the SCANZ role (`SCANZ_ROLE_ID`) can use `/ping`.

The Worker checks `interaction.member.roles` before running command logic.

The bot only accepts interactions from the configured guild (`DISCORD_GUILD_ID`). DMs are rejected.

---

## Cooldown

Do not implement persistent cooldowns for MVP.

But add TODO comments where cooldowns should go.

Future cooldown idea:

```txt
1 ping per user per 5 minutes
1 ping per activity per 10 minutes
```

This could be implemented later with Cloudflare KV or D1.

---

## Logging

For MVP, use `console.log` / `console.error`.

Log:

* command received
* user ID
* guild ID
* selected activity
* whether voice channel was found
* target ping channel
* Discord API errors

Do not log bot token or secrets.

---

## README requirements

Create a clear README with:

* What the bot does
* How `/ping` works
* How to configure activities
* Required environment variables
* Local development
* Deployment
* Command registration
* Discord app setup
* Known MVP limitations
* Future improvements

---

## Acceptance criteria

The MVP is done when:

1. `/ping` appears in the Discord server.
2. `/ping activity:mining` works.
3. `/ping activity:mining description:"test"` works.
4. If the user is not in voice, the bot replies ephemerally with an error.
5. If the user is in voice, the bot posts a public ping to the configured channel.
6. The public ping mentions the configured activity role.
7. The public ping includes the voice channel mention.
8. The command user receives an ephemeral success message.
9. Discord request signatures are verified.
10. Secrets are not committed.
11. Activity config is easy to edit.
12. The Worker deploys successfully to Cloudflare.

---

## Nice-to-have, only if quick

If simple, include a health check for GET requests:

```txt
GET /
```

Response:

```txt
SCANZ activity ping bot is running.
```

Do not expose any secrets or config.

---

## Do not build yet

Do not build:

* Web dashboard
* Database
* Discord Gateway bot
* Scheduled tasks
* Full admin panel
* Auto-cleanup
* Complex permission system
* Multi-guild support

Keep the MVP small and shippable.
