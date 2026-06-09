export function buildPingHelpMessage(): string {
  return [
    "**Dolly Bot — Activity Ping Help**",
    "",
    "Use `/ping` to summon members for an activity and invite them to your voice channel.",
    "",
    "**Before you run `/ping`**",
    "• You need the **SCANZ** role",
    "• Join a regular voice channel (not AFK or a stage channel)",
    "",
    "**How to use `/ping`**",
    "1. Pick an **activity** (e.g. Salvagers, Miners, Fleet Ops)",
    "2. Add a **description** of what you're doing (required, up to 500 characters)",
    "3. Submit — Dolly posts a public ping, @mentions the activity role, links your voice channel, and opens a discussion thread on the message",
    "",
    "**Example**",
    "`/ping activity:Salvagers description:Need a crew for salvage ops tonight`",
    "",
    "You'll get a private confirmation when the ping is sent. Everyone else sees the public message in the activity channel.",
  ].join("\n");
}
