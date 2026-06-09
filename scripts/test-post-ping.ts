import { resolve } from "node:path";
import { getActivity } from "../src/config/activities";
import { createDiscordApiClient } from "../src/discord/api";
import { buildPingMessage } from "../src/commands/ping/format";
import { loadLocalEnv } from "../src/lib/load-env";

loadLocalEnv(resolve(__dirname, ".."));

const activityKey = process.argv[2] ?? "miners";
const activity = getActivity(activityKey);

if (!activity) {
  throw new Error(`Unknown activity: ${activityKey}`);
}

const channelId = process.env.DEFAULT_PING_CHANNEL_ID;
if (!channelId) {
  throw new Error("Missing DEFAULT_PING_CHANNEL_ID");
}

const api = createDiscordApiClient({
  DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY ?? "",
  DISCORD_APPLICATION_ID: process.env.DISCORD_APPLICATION_ID ?? "",
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN ?? "",
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID ?? "",
  SCANZ_ROLE_ID: process.env.SCANZ_ROLE_ID ?? "",
  DEFAULT_PING_CHANNEL_ID: channelId,
  COOLDOWN_KV: {} as KVNamespace,
});

const testVoiceChannelId = channelId;

const content = buildPingMessage({
  roleId: activity.roleId,
  userId: process.env.SCANZ_ROLE_ID ?? "000000000000000000",
  voiceChannelId: testVoiceChannelId,
  activityLabel: activity.label,
  description: "Permission test ping — safe to delete",
});

async function main() {
  try {
    await api.postMessage(channelId, content, {
      roles: [activity.roleId],
      users: [],
      channels: [testVoiceChannelId],
    });
    console.log("Post succeeded");
  } catch (error) {
    console.error("Post failed:", error);
    process.exit(1);
  }
}

main();
