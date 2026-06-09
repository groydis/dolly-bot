import { executeCommand } from "./commands/execute";
import { COMMAND_HANDLERS } from "./commands/registry";
import { verifyDiscordRequest } from "./discord/verify";
import {
  deferEphemeral,
  ephemeralResponse,
  jsonResponse,
  pongResponse,
} from "./discord/interactions";
import {
  InteractionType,
  type ChatInputCommandInteraction,
  type Interaction,
} from "./discord/types";
import { errorToMessage } from "./errors";
import type { Env } from "./env";

const HEALTH_MESSAGE = "SCANZ activity ping bot is running.";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    if (request.method === "GET") {
      return new Response(HEALTH_MESSAGE, { status: 200 });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");
    const body = await request.text();

    const isValid = await verifyDiscordRequest(
      body,
      signature,
      timestamp,
      env.DISCORD_PUBLIC_KEY,
    );

    if (!isValid) {
      return new Response("Bad request signature", { status: 401 });
    }

    const interaction = JSON.parse(body) as Interaction;

    if (interaction.type === InteractionType.PING) {
      return jsonResponse(pongResponse());
    }

    if (interaction.type !== InteractionType.APPLICATION_COMMAND) {
      return jsonResponse(
        ephemeralResponse("That interaction type is not supported."),
      );
    }

    const commandInteraction = interaction as ChatInputCommandInteraction;
    const commandName = commandInteraction.data.name;

    if (!COMMAND_HANDLERS.has(commandName)) {
      return jsonResponse(
        ephemeralResponse(errorToMessage({ code: "UNKNOWN_COMMAND" })),
      );
    }

    const deferredResponse = jsonResponse(deferEphemeral());

    ctx.waitUntil(
      executeCommand(env, commandInteraction).catch((error) => {
        console.error("Background command execution failed", { error });
      }),
    );

    return deferredResponse;
  },
};
