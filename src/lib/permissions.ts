// Minimal guild permissions for dolly-bot invite URL (see scripts/generate-invite-url.ts).
// Scope `applications.commands` is separate from this bitmask.
//
// View Channels + Send Messages — read/post in text channels
// Mention @everyone, @here, and All Roles — ping activity roles via allowed_mentions
// Connect — detect which voice channel the user is in for /ping
// Create Public Threads + Send Messages in Threads — ping discussion threads
// Manage Roles — /verify role grants; partner org role creation
// Manage Nicknames — /verify RSI handle nicknames
// Manage Channels — partner org channel creation
// Attach Files — audit CSV posts to AUDIT_CHANNEL_ID
// Read Message History — thread creation and channel access
// Embed Links — channel/voice mentions render correctly in pings
export const BOT_PERMISSIONS = 309641595920;
