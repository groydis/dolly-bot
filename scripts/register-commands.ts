/**
 * Registers (overwrites) the bot's slash commands for the configured guild.
 * Sends the full command set from `src/commands/registry` to Discord via a PUT,
 * so it both adds new commands and removes any that are no longer defined.
 * Run this whenever commands are added, removed, or their definitions change.
 */
import { resolve } from "node:path";
import { ALL_COMMANDS } from "../src/commands/registry";
import { loadLocalEnv } from "../src/lib/load-env";

loadLocalEnv(resolve(__dirname, ".."));

const DISCORD_API_BASE = "https://discord.com/api/v10";
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function registerCommands(): Promise<void> {
  const applicationId = requireEnv("DISCORD_APPLICATION_ID");
  const botToken = requireEnv("DISCORD_BOT_TOKEN");
  const guildId = requireEnv("DISCORD_GUILD_ID");

  const url = `${DISCORD_API_BASE}/applications/${applicationId}/guilds/${guildId}/commands`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ALL_COMMANDS),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to register commands (${response.status}): ${body}`,
    );
  }

  const commands = (await response.json()) as Array<{ id: string; name: string }>;
  console.log(`Registered ${commands.length} command(s):`);
  for (const command of commands) {
    console.log(`- /${command.name} (${command.id})`);
  }
}

registerCommands().catch((error) => {
  console.error(error);
  process.exit(1);
});
