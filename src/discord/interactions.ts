import type { Env } from "../env";
import {
  InteractionResponseType,
  MessageFlags,
  type InteractionResponse,
} from "./types";

const FOLLOW_UP_MAX_ATTEMPTS = 5;
const FOLLOW_UP_RETRY_DELAY_MS = 300;

export function jsonResponse(
  data: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function pongResponse(): InteractionResponse {
  return { type: InteractionResponseType.PONG };
}

export function deferEphemeral(): InteractionResponse {
  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: MessageFlags.EPHEMERAL,
    },
  };
}

export function ephemeralResponse(content: string): InteractionResponse {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: MessageFlags.EPHEMERAL,
      allowed_mentions: { parse: [] },
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function followUpEphemeral(
  applicationId: string,
  interactionToken: string,
  content: string,
): Promise<void> {
  const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;

  for (let attempt = 1; attempt <= FOLLOW_UP_MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await sleep(FOLLOW_UP_RETRY_DELAY_MS * attempt);
    }

    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        flags: MessageFlags.EPHEMERAL,
        allowed_mentions: { parse: [] },
      }),
    });

    if (response.ok) {
      return;
    }

    const body = await response.text();
    console.error("Failed to send interaction follow-up", {
      attempt,
      status: response.status,
      body,
    });

    // Discord may not have processed the deferred ACK yet (10008 Unknown Message).
    if (attempt === FOLLOW_UP_MAX_ATTEMPTS) {
      throw new Error(
        `Interaction follow-up failed after ${FOLLOW_UP_MAX_ATTEMPTS} attempts (${response.status}): ${body}`,
      );
    }
  }
}
