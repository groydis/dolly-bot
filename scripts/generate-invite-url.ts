import { resolve } from "node:path";
import { loadLocalEnv } from "../src/lib/load-env";

loadLocalEnv(resolve(__dirname, ".."));

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

import { BOT_PERMISSIONS } from "../src/lib/permissions";

const applicationId = requireEnv("DISCORD_APPLICATION_ID");
const guildId = requireEnv("DISCORD_GUILD_ID");

const params = new URLSearchParams({
  client_id: applicationId,
  scope: "bot applications.commands",
  permissions: String(BOT_PERMISSIONS),
  guild_id: guildId,
  disable_guild_select: "true",
});

const inviteUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;

console.log("SCANZ-only bot invite URL (private bot — app owner must use this):\n");
console.log(inviteUrl);
