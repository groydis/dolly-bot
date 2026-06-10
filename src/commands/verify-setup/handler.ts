import { DiscordApiError } from "../../discord/api";
import type { AppError } from "../../errors";
import { err, ok, type Result } from "../../lib/result";
import type { CommandContext } from "../types";
import type { FollowUpPayload } from "../types";
import { buildVerifyChannelMessage } from "../verify/channel-message";

export async function handleVerifySetupCommand(
  context: CommandContext,
): Promise<Result<FollowUpPayload, AppError>> {
  const { env, api } = context;

  if (!env.VERIFY_CHANNEL_ID) {
    return err({ code: "VERIFY_CHANNEL_NOT_CONFIGURED" });
  }

  try {
    await api.postChannelMessage(
      env.VERIFY_CHANNEL_ID,
      buildVerifyChannelMessage(),
    );
  } catch (error) {
    if (error instanceof DiscordApiError && error.status === 403) {
      return err({
        code: "VERIFY_CHANNEL_POST_FAILED",
        channelId: env.VERIFY_CHANNEL_ID,
      });
    }

    throw error;
  }

  return ok({
    content: `Posted the verification embed to <#${env.VERIFY_CHANNEL_ID}>. Pin it if you want it to stay easy to find.`,
  });
}
