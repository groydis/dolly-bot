import type { DiscordApi } from "../../discord/api";
import type { Env } from "../../env";
import {
  ChannelType,
  PermissionFlags,
  PermissionOverwriteType,
} from "../../discord/types";
import { KV_TTL_ORG_PROVISION_SECONDS } from "../../lib/kv-constants";
import {
  orgChannelName,
  orgRoleName,
} from "../../lib/org-symbol";
import { verifyLog } from "./log";

function requirePartnerOrgCategoryId(env: Env): string {
  const categoryId = env.PARTNER_ORG_CATEGORY_ID?.trim();
  if (!categoryId) {
    throw new Error("PARTNER_ORG_CATEGORY_ID is not configured");
  }

  return categoryId;
}

async function ensureChannelInCategory(
  api: DiscordApi,
  channelId: string,
  categoryId: string,
): Promise<void> {
  const channel = await api.getChannel(channelId);
  if (channel.type !== ChannelType.GUILD_TEXT) {
    throw new Error(`Cached org channel ${channelId} is not a text channel`);
  }

  if (channel.parent_id === categoryId) {
    return;
  }

  verifyLog("org_channel_moving", {
    channelId,
    fromParentId: channel.parent_id ?? null,
    toCategoryId: categoryId,
  });
  await api.modifyGuildChannel(channelId, { parent_id: categoryId });
}

function orgRoleCacheKey(orgSid: string): string {
  return `org_role:${orgSid.toUpperCase()}`;
}

function orgChannelCacheKey(orgSid: string): string {
  return `org_channel:${orgSid.toUpperCase()}`;
}

async function ensureCachedResource<T extends string>(input: {
  kv: KVNamespace;
  cacheKey: string;
  ttlSeconds: number;
  onCacheHit?: (value: T) => void;
  resolve: () => Promise<T>;
}): Promise<T> {
  const cached = await input.kv.get(input.cacheKey);
  if (cached) {
    input.onCacheHit?.(cached as T);
    return cached as T;
  }

  const value = await input.resolve();
  await input.kv.put(input.cacheKey, value, {
    expirationTtl: input.ttlSeconds,
  });
  return value;
}

export async function ensurePartnerOrgRole(
  api: DiscordApi,
  env: Env,
  guildId: string,
  orgSid: string,
): Promise<string> {
  const cacheKey = orgRoleCacheKey(orgSid);

  return ensureCachedResource({
    kv: env.VERIFY_KV,
    cacheKey,
    ttlSeconds: KV_TTL_ORG_PROVISION_SECONDS,
    onCacheHit: (roleId) => {
      verifyLog("org_role_cache_hit", { orgSid, roleId });
    },
    resolve: async () => {
      const roleName = orgRoleName(orgSid);
      const roles = await api.listGuildRoles(guildId);
      const existing = roles.find((role) => role.name === roleName);
      if (existing) {
        verifyLog("org_role_found", { orgSid, roleName, roleId: existing.id });
        return existing.id;
      }

      verifyLog("org_role_creating", { orgSid, roleName });
      const created = await api.createGuildRole(guildId, {
        name: roleName,
        mentionable: true,
      });
      return created.id;
    },
  });
}

export async function ensurePartnerOrgChannel(
  api: DiscordApi,
  env: Env,
  guildId: string,
  orgSid: string,
  orgRoleId: string,
): Promise<{ channelId: string; channelName: string; created: boolean }> {
  const channelName = orgChannelName(orgSid);
  const categoryId = requirePartnerOrgCategoryId(env);
  const cacheKey = orgChannelCacheKey(orgSid);

  const cached = await env.VERIFY_KV.get(cacheKey);
  if (cached) {
    try {
      verifyLog("org_channel_cache_hit", {
        orgSid,
        channelId: cached,
        channelName,
        categoryId,
      });
      await ensureChannelInCategory(api, cached, categoryId);
      return { channelId: cached, channelName, created: false };
    } catch (error) {
      verifyLog("org_channel_cache_invalid", {
        orgSid,
        channelId: cached,
        error: error instanceof Error ? error.message : String(error),
      });
      await env.VERIFY_KV.delete(cacheKey);
    }
  }

  let created = false;
  const channelId = await ensureCachedResource({
    kv: env.VERIFY_KV,
    cacheKey,
    ttlSeconds: KV_TTL_ORG_PROVISION_SECONDS,
    resolve: async () => {
      const channels = await api.listGuildChannels(guildId);
      const existing = channels.find(
        (channel) =>
          channel.type === ChannelType.GUILD_TEXT &&
          channel.name === channelName,
      );
      if (existing) {
        verifyLog("org_channel_found", {
          orgSid,
          channelName,
          channelId: existing.id,
          categoryId,
          parentId: existing.parent_id ?? null,
        });
        await ensureChannelInCategory(api, existing.id, categoryId);
        return existing.id;
      }

      verifyLog("org_channel_creating", {
        orgSid,
        channelName,
        categoryId,
        orgRoleId,
        botUserId: env.DISCORD_APPLICATION_ID,
      });
      created = true;
      const newChannel = await api.createGuildChannel(guildId, {
        name: channelName,
        type: ChannelType.GUILD_TEXT,
        parent_id: categoryId,
        permission_overwrites: [
          {
            id: guildId,
            type: PermissionOverwriteType.ROLE,
            deny: PermissionFlags.VIEW_CHANNEL,
          },
          {
            id: orgRoleId,
            type: PermissionOverwriteType.ROLE,
            allow: PermissionFlags.VIEW_CHANNEL_AND_HISTORY,
          },
          {
            id: env.DISCORD_APPLICATION_ID,
            type: PermissionOverwriteType.MEMBER,
            allow: PermissionFlags.VIEW_CHANNEL_AND_HISTORY,
          },
        ],
      });
      return newChannel.id;
    },
  });

  await ensureChannelInCategory(api, channelId, categoryId);

  return { channelId, channelName, created };
}

export async function provisionPartnerOrg(
  api: DiscordApi,
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
