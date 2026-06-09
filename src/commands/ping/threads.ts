import type { DiscordApiClient } from "../../discord/api";
import { buildThreadName, THREAD_DISCUSS_MESSAGE } from "./format";

export async function createPingDiscussionThread(
  api: DiscordApiClient,
  channelId: string,
  messageId: string,
  activityLabel: string,
): Promise<void> {
  const thread = await api.createPublicThreadFromMessage(
    channelId,
    messageId,
    buildThreadName(activityLabel),
  );

  await api.postSimpleMessage(thread.id, THREAD_DISCUSS_MESSAGE);

  console.log("Ping discussion thread created", {
    channelId,
    messageId,
    threadId: thread.id,
    activityLabel,
  });
}
