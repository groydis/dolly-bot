/**
 * Debugging helper for the Discord voice-state API. Given a Discord user ID,
 * it fetches that user's voice state and the full guild voice-state list,
 * printing the HTTP status and response body for each. Useful for confirming
 * the bot has the right intents/permissions to read who is in voice.
 * Usage: npx tsx scripts/test-voice-state.ts <discord_user_id>
 */
import { resolve } from "node:path";
import { loadLocalEnv } from "../src/lib/load-env";

loadLocalEnv(resolve(__dirname, ".."));

const guildId = process.env.DISCORD_GUILD_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const userId = process.argv[2];

if (!guildId || !botToken) {
  throw new Error("Missing DISCORD_GUILD_ID or DISCORD_BOT_TOKEN");
}

if (!userId) {
  console.error("Usage: npx tsx scripts/test-voice-state.ts <discord_user_id>");
  process.exit(1);
}

const base = "https://discord.com/api/v10";
const headers = { Authorization: `Bot ${botToken}` };

async function check(label: string, url: string) {
  const response = await fetch(url, { headers });
  const body = await response.text();
  console.log(`\n${label}`);
  console.log(`  ${response.status} ${response.statusText}`);
  console.log(`  ${body.slice(0, 300)}`);
  return response;
}

await check(
  "Voice state",
  `${base}/guilds/${guildId}/voice-states/${userId}`,
);

const listResponse = await fetch(`${base}/guilds/${guildId}/voice-states`, {
  headers,
});
const listBody = await listResponse.text();
console.log("\nAll voice states");
console.log(`  ${listResponse.status} ${listResponse.statusText}`);
console.log(`  ${listBody.slice(0, 500)}`);
