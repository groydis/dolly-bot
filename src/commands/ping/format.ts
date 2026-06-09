export interface PingMessageParams {
  roleId: string;
  userId: string;
  voiceChannelId: string;
  activityLabel: string;
  description?: string;
}

export function buildPingMessage(params: PingMessageParams): string {
  const lines = [
    `<@&${params.roleId}>`,
    "",
    `**${params.activityLabel} ping started by <@${params.userId}>**`,
  ];

  if (params.description) {
    lines.push("", params.description);
  }

  lines.push("", `Join them in <#${params.voiceChannelId}> to jump in.`);

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
