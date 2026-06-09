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
