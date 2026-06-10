import type { ActionRow, ModalActionRowDefinition } from "./types";
import {
  InteractionResponseType,
  MessageFlags,
  type InteractionResponse,
} from "./types";
import {
  FOLLOW_UP_MAX_ATTEMPTS,
  interactionFollowUpUrl,
} from "./constants";
import { followUpRetryDelayMs } from "./follow-up-retry";
import { sleep } from "../lib/async";
import { HttpStatus } from "../lib/http-status";

export interface EphemeralFollowUp {
  content: string;
  components?: ActionRow[];
}

export function jsonResponse(
  data: unknown,
  status = HttpStatus.OK,
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

export function modalResponse(input: {
  customId: string;
  title: string;
  components: ModalActionRowDefinition[];
}): InteractionResponse {
  return {
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: input.customId,
      title: input.title,
      components: input.components,
    },
  };
}

function normalizeFollowUp(
  payload: EphemeralFollowUp | string,
): EphemeralFollowUp {
  if (typeof payload === "string") {
    return { content: payload };
  }

  return payload;
}

export async function followUpEphemeral(
  applicationId: string,
  interactionToken: string,
  payload: EphemeralFollowUp | string,
): Promise<void> {
  const followUp = normalizeFollowUp(payload);
  const url = interactionFollowUpUrl(applicationId, interactionToken);

  const body: Record<string, unknown> = {
    content: followUp.content,
    flags: MessageFlags.EPHEMERAL,
    allowed_mentions: { parse: [] },
  };

  if (followUp.components) {
    body.components = followUp.components;
  }

  for (let attempt = 1; attempt <= FOLLOW_UP_MAX_ATTEMPTS; attempt++) {
    const retryDelayMs = followUpRetryDelayMs(attempt);
    if (retryDelayMs !== null) {
      await sleep(retryDelayMs);
    }

    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return;
    }

    const responseBody = await response.text();
    console.error("Failed to send interaction follow-up", {
      attempt,
      status: response.status,
      body: responseBody,
    });

    if (attempt === FOLLOW_UP_MAX_ATTEMPTS) {
      throw new Error(
        `Interaction follow-up failed after ${FOLLOW_UP_MAX_ATTEMPTS} attempts (${response.status}): ${responseBody}`,
      );
    }
  }
}
