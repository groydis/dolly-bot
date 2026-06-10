import { AUDIT_CONTINUE_PATH } from "./audit/constants";
import { processAuditRunBatch } from "./audit/process-audit-run";
import { runScheduledAudit } from "./audit/scheduled";
import { executeCommand } from "./commands/execute";
import { COMMAND_HANDLERS } from "./commands/registry";
import { executeVerifyConfirm } from "./commands/verify/execute-confirm";
import { executeVerifyModal } from "./commands/verify/execute-modal";
import { handleVerifyStartButton } from "./commands/verify/execute-start";
import {
  isVerifyStartButtonId,
  VERIFY_BUTTON_PREFIX,
} from "./commands/verify/constants";
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
  type ComponentInteraction,
  type Interaction,
  type ModalSubmitInteraction,
} from "./discord/types";
import { errorToMessage } from "./errors";
import type { Env } from "./env";
import { HttpStatus } from "./lib/http-status";

const HEALTH_MESSAGE = "SCANZ activity ping bot is running.";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return new Response(HEALTH_MESSAGE, { status: HttpStatus.OK });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: HttpStatus.METHOD_NOT_ALLOWED,
      });
    }

    if (url.pathname === AUDIT_CONTINUE_PATH) {
      let runId: string | undefined;

      try {
        const body = (await request.json()) as { runId?: string };
        runId = body.runId;
      } catch {
        return new Response("Invalid JSON body", { status: 400 });
      }

      if (!runId) {
        return new Response("Missing runId", { status: 400 });
      }

      ctx.waitUntil(
        processAuditRunBatch(env, runId).catch((error) => {
          console.error("Audit continuation failed", { runId, error });
        }),
      );

      return new Response("accepted", { status: HttpStatus.ACCEPTED });
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
      return new Response("Bad request signature", {
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    const interaction = JSON.parse(body) as Interaction;

    if (interaction.type === InteractionType.PING) {
      return jsonResponse(pongResponse());
    }

    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const componentInteraction = interaction as ComponentInteraction;
      const customId = componentInteraction.data.custom_id;

      if (isVerifyStartButtonId(customId)) {
        return jsonResponse(
          handleVerifyStartButton(env, componentInteraction),
        );
      }

      if (customId.startsWith(VERIFY_BUTTON_PREFIX)) {
        const deferredResponse = jsonResponse(deferEphemeral());

        ctx.waitUntil(
          executeVerifyConfirm(env, componentInteraction).catch((error) => {
            console.error("Background verify confirm failed", { error });
          }),
        );

        return deferredResponse;
      }

      return jsonResponse(
        ephemeralResponse("That interaction type is not supported."),
      );
    }

    if (interaction.type === InteractionType.MODAL_SUBMIT) {
      const modalInteraction = interaction as ModalSubmitInteraction;
      const deferredResponse = jsonResponse(deferEphemeral());

      ctx.waitUntil(
        executeVerifyModal(env, modalInteraction).catch((error) => {
          console.error("Background verify modal failed", { error });
        }),
      );

      return deferredResponse;
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

  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      runScheduledAudit(env).catch((error) => {
        console.error("Scheduled audit failed", { error });
      }),
    );
  },
};
