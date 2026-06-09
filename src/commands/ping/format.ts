export interface PingMessageParams {
  roleId: string;
  userId: string;
  voiceChannelId: string;
  activityLabel: string;
  description: string;
}

export function buildPingMessage(params: PingMessageParams): string {
  const lines = [
    `<@&${params.roleId}>, **<@${params.userId}> is putting a group together!**`,
  ];

  lines.push("", params.description, "", `Join them in <#${params.voiceChannelId}> for additional info!`);

  return lines.join("\n");
}

export function buildSuccessMessage(activityLabel: string): string {
  return `${activityLabel} ping sent!`;
}

export function buildThreadName(activityLabel: string): string {
  const name = `${activityLabel} discussion`;
  return name.length > 100 ? name.slice(0, 100) : name;
}

export const THREAD_DISCUSS_MESSAGE = "Please discuss here...";
