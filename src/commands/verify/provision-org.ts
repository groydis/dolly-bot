import type { DiscordApiClient } from "../../discord/api";
import type { Env } from "../../env";
import {
  orgChannelName,
  orgRoleName,
} from "../../lib/org-symbol";
import { verifyLog } from "./log";

const CHANNEL_TYPE_GUILD_TEXT = 0;
const PERMISSION_VIEW_CHANNEL = "1024";
const PERMISSION_VIEW_SEND_HISTORY = "68608";

function orgRoleCacheKey(orgSid: string): string {
  return `org_role:${orgSid.toUpperCase()}`;
}

function orgChannelCacheKey(orgSid: string): string {
  return `org_channel:${orgSid.toUpperCase()}`;
}

export async function ensurePartnerOrgRole(
  api: DiscordApiClient,
  env: Env,
  guildId: string,
  orgSid: string,
): Promise<string> {
  const cacheKey = orgRoleCacheKey(orgSid);
  const cached = await env.VERIFY_KV.get(cacheKey);
  if (cached) {
    verifyLog("org_role_cache_hit", { orgSid, roleId: cached });
    return cached;
  }

  const roleName = orgRoleName(orgSid);
  const roles = await api.listGuildRoles(guildId);
  const existing = roles.find((role) => role.name === roleName);
  if (existing) {
    verifyLog("org_role_found", { orgSid, roleName, roleId: existing.id });
    await env.VERIFY_KV.put(cacheKey, existing.id);
    return existing.id;
  }

  verifyLog("org_role_creating", { orgSid, roleName });
  const created = await api.createGuildRole(guildId, {
    name: roleName,
    mentionable: true,
  });
  await env.VERIFY_KV.put(cacheKey, created.id);
  return created.id;
}

export async function ensurePartnerOrgChannel(
  api: DiscordApiClient,
  env: Env,
  guildId: string,
  orgSid: string,
  orgRoleId: string,
): Promise<{ channelId: string; channelName: string; created: boolean }> {
  const channelName = orgChannelName(orgSid);
  const cacheKey = orgChannelCacheKey(orgSid);
  const cached = await env.VERIFY_KV.get(cacheKey);
  if (cached) {
    verifyLog("org_channel_cache_hit", { orgSid, channelId: cached, channelName });
    return { channelId: cached, channelName, created: false };
  }

  const channels = await api.listGuildChannels(guildId);
  const existing = channels.find(
    (channel) =>
      channel.type === CHANNEL_TYPE_GUILD_TEXT && channel.name === channelName,
  );
  if (existing) {
    verifyLog("org_channel_found", {
      orgSid,
      channelName,
      channelId: existing.id,
    });
    await env.VERIFY_KV.put(cacheKey, existing.id);
    return { channelId: existing.id, channelName, created: false };
  }

  verifyLog("org_channel_creating", {
    orgSid,
    channelName,
    categoryId: env.PARTNER_ORG_CATEGORY_ID,
    orgRoleId,
    botMemberRoleId: env.BOT_MEMBER_ROLE_ID,
  });
  const created = await api.createGuildChannel(guildId, {
    name: channelName,
    type: CHANNEL_TYPE_GUILD_TEXT,
    parent_id: env.PARTNER_ORG_CATEGORY_ID,
    permission_overwrites: [
      {
        id: guildId,
        type: 0,
        deny: PERMISSION_VIEW_CHANNEL,
      },
      {
        id: orgRoleId,
        type: 0,
        allow: PERMISSION_VIEW_SEND_HISTORY,
      },
      {
        id: env.BOT_MEMBER_ROLE_ID,
        type: 0,
        allow: PERMISSION_VIEW_SEND_HISTORY,
      },
    ],
  });

  await env.VERIFY_KV.put(cacheKey, created.id);
  return { channelId: created.id, channelName, created: true };
}

export async function provisionPartnerOrg(
  api: DiscordApiClient,
  env: Env,
  guildId: string,
  orgSid: string,
): Promise<{ orgRoleId: string; channelName: string; channelCreated: boolean }> {
  const orgRoleId = await ensurePartnerOrgRole(api, env, guildId, orgSid);
  const channel = await ensurePartnerOrgChannel(
    api,
    env,
    guildId,
    orgSid,
    orgRoleId,
  );

  if (channel.created) {
    await api.postSimpleMessage(
      channel.channelId,
      `Welcome to **#${channel.channelName}** — this channel is for **${orgSid}** members.`,
    );
  }

  return {
    orgRoleId,
    channelName: channel.channelName,
    channelCreated: channel.created,
  };
}
