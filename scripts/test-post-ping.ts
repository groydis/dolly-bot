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

const roleId = activity.roleId;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

const channelId = requireEnv("DEFAULT_PING_CHANNEL_ID");

const api = createDiscordApiClient({
  DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY ?? "",
  DISCORD_APPLICATION_ID: process.env.DISCORD_APPLICATION_ID ?? "",
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN ?? "",
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID ?? "",
  SCANZ_ROLE_ID: process.env.SCANZ_ROLE_ID ?? "",
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID ?? "",
  AFFILIATE_ROLE_ID: process.env.AFFILIATE_ROLE_ID ?? "",
  DEFAULT_PING_CHANNEL_ID: channelId,
  PARTNER_ORG_CATEGORY_ID: process.env.PARTNER_ORG_CATEGORY_ID ?? "",
  BOT_MEMBER_ROLE_ID: process.env.BOT_MEMBER_ROLE_ID ?? "",
  AUDIT_CHANNEL_ID: process.env.AUDIT_CHANNEL_ID ?? "",
  COOLDOWN_KV: {} as KVNamespace,
  VERIFY_KV: {} as KVNamespace,
  VERIFY_DB: {} as D1Database,
  AUDIT_BUCKET: {} as R2Bucket,
  WORKER_SELF: { fetch: fetch } as Fetcher,
});

const testVoiceChannelId = channelId;

const content = buildPingMessage({
  roleId,
  userId: process.env.SCANZ_ROLE_ID ?? "000000000000000000",
  voiceChannelId: testVoiceChannelId,
  activityLabel: activity.label,
  description: "Permission test ping — safe to delete",
});

async function main() {
  try {
    await api.postMessage(channelId, content, {
      roles: [roleId],
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
