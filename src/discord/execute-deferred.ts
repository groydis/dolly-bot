import { sleep } from "../lib/async";
import { DEFER_ACK_DELAY_MS } from "./interaction-utils";
import { followUpEphemeral } from "./interactions";
import type { ActionRow } from "./types";

export type DeferredFollowUp =
  | string
  | {
      content: string;
      components?: ActionRow[];
      auditRunId?: string;
    };

export async function executeDeferredInteraction(options: {
  applicationId: string;
  interactionToken: string;
  deferMs?: number;
  fallbackMessage: string;
  logLabel: string;
  run: (followUp: (payload: DeferredFollowUp) => Promise<void>) => Promise<void>;
}): Promise<void> {
  const followUp = (payload: DeferredFollowUp) =>
    followUpEphemeral(
      options.applicationId,
      options.interactionToken,
      payload,
    );

  await sleep(options.deferMs ?? DEFER_ACK_DELAY_MS);

  try {
    await options.run(followUp);
  } catch (error) {
    console.error(`Unhandled ${options.logLabel} error`, { error });

    try {
      await followUp(options.fallbackMessage);
    } catch (followUpError) {
      console.error(`Failed to send ${options.logLabel} follow-up`, {
        followUpError,
      });
    }
  }
}
