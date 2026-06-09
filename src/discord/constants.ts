export const DISCORD_API_BASE = "https://discord.com/api/v10";

export function interactionFollowUpUrl(
  applicationId: string,
  interactionToken: string,
): string {
  return `${DISCORD_API_BASE}/webhooks/${applicationId}/${interactionToken}/messages/@original`;
}
