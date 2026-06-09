import type { DiscordApiClient } from "../../discord/api";
import { buildThreadName, THREAD_DISCUSS_MESSAGE } from "./format";

/** Discord allows 60, 1440, 4320, or 10080 minutes. */
export const PING_THREAD_AUTO_ARCHIVE_MINUTES = 60;

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
    PING_THREAD_AUTO_ARCHIVE_MINUTES,
  );

  await api.postSimpleMessage(thread.id, THREAD_DISCUSS_MESSAGE);

  console.log("Ping discussion thread created", {
    channelId,
    messageId,
    threadId: thread.id,
    activityLabel,
  });
}
