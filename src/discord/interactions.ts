import type { Env } from "../env";
import {
  InteractionResponseType,
  MessageFlags,
  type InteractionResponse,
} from "./types";

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

export async function followUpEphemeral(
  env: Env,
  interactionToken: string,
  content: string,
): Promise<void> {
  const url = `https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interactionToken}/messages/@original`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      flags: MessageFlags.EPHEMERAL,
      allowed_mentions: { parse: [] },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Failed to send interaction follow-up", {
      status: response.status,
      body,
    });
  }
}
