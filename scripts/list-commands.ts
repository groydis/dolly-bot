import { resolve } from "node:path";
import { loadLocalEnv } from "../src/lib/load-env";

loadLocalEnv(resolve(__dirname, ".."));

async function main() {
  const applicationId = process.env.DISCORD_APPLICATION_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!applicationId || !botToken || !guildId) {
    throw new Error("Missing Discord env vars");
  }

  const response = await fetch(
    `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
    { headers: { Authorization: `Bot ${botToken}` } },
  );

  console.log(JSON.stringify(await response.json(), null, 2));
}

main();
