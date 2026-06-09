export const DISCORD_API_BASE = "https://discord.com/api/v10";

export const FOLLOW_UP_MAX_ATTEMPTS = 5;
export const FOLLOW_UP_RETRY_DELAY_MS = 300;

export const DISCORD_NICKNAME_MAX_LENGTH = 32;
export const DISCORD_THREAD_NAME_MAX_LENGTH = 100;
export const DISCORD_GUILD_MEMBERS_PAGE_SIZE = 1000;
export const PING_DESCRIPTION_MAX_LENGTH = 500;

export function interactionFollowUpUrl(
  applicationId: string,
  interactionToken: string,
): string {
  return `${DISCORD_API_BASE}/webhooks/${applicationId}/${interactionToken}/messages/@original`;
}
