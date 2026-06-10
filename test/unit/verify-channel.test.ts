import { describe, expect, it, vi } from "vitest";
import { handleVerifySetupCommand } from "../../src/commands/verify-setup/handler";
import {
  buildPartnerVerifyModalResponse,
  buildScanzVerifyModalResponse,
  parseModalTextField,
} from "../../src/commands/verify/modals";
import { startVerificationSession } from "../../src/commands/verify/start";
import { handleVerifyStartButton } from "../../src/commands/verify/execute-start";
import {
  VERIFY_MODAL_HANDLE_FIELD,
  VERIFY_MODAL_ORG_FIELD,
  VERIFY_MODAL_PARTNER_ID,
  VERIFY_MODAL_SCANZ_ID,
  VERIFY_START_PARTNER_ID,
  VERIFY_START_SCANZ_ID,
} from "../../src/commands/verify/constants";
import { buildVerifyChannelMessage } from "../../src/commands/verify/channel-message";
import { InteractionResponseType, InteractionType } from "../../src/discord/types";
import { createMemoryKv } from "../helpers/memory-kv";
import { mockEnv } from "../helpers/mock-env";
import { DiscordApiError } from "../../src/discord/api";
import { createMockDiscordApi } from "../helpers/mock-discord-api";

describe("verify channel flow", () => {
  it("builds channel embed with two start buttons", () => {
    const message = buildVerifyChannelMessage();

    expect(message.embeds).toHaveLength(1);
    expect(message.components).toHaveLength(1);
    expect(message.components?.[0]?.components).toHaveLength(2);
    expect(message.components?.[0]?.components[0]?.custom_id).toBe(
      VERIFY_START_SCANZ_ID,
    );
    expect(message.components?.[0]?.components[1]?.custom_id).toBe(
      VERIFY_START_PARTNER_ID,
    );
  });

  it("opens SCANZ modal from start button", () => {
    const response = handleVerifyStartButton(mockEnv(), {
      id: "1",
      application_id: "app",
      type: InteractionType.MESSAGE_COMPONENT,
      token: "token",
      guild_id: mockEnv().DISCORD_GUILD_ID,
      data: {
        custom_id: VERIFY_START_SCANZ_ID,
        component_type: 2,
      },
    });

    expect(response.type).toBe(InteractionResponseType.MODAL);
    expect(response.data?.custom_id).toBe(VERIFY_MODAL_SCANZ_ID);
    expect(response.data?.components).toHaveLength(1);
  });

  it("opens partner modal from start button", () => {
    const response = buildPartnerVerifyModalResponse();

    expect(response.type).toBe(InteractionResponseType.MODAL);
    expect(response.data?.custom_id).toBe(VERIFY_MODAL_PARTNER_ID);
    expect(response.data?.components).toHaveLength(2);
  });

  it("starts SCANZ session from modal fields", async () => {
    const kv = createMemoryKv();
    const result = await startVerificationSession(
      kv,
      "user-1",
      "Test_Pilot",
      undefined,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.content).toContain("[SCANZ:");
      expect(result.value.components).toHaveLength(1);
    }
  });

  it("starts partner session from modal fields", async () => {
    const kv = createMemoryKv();
    const result = await startVerificationSession(
      kv,
      "user-1",
      "Test_Pilot",
      "ZAP",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.content).toContain("Partner org: **ZAP**");
      expect(result.value.content).toContain("[ZAP:");
    }
  });

  it("parses modal text fields", () => {
    const value = parseModalTextField(
      {
        id: "1",
        application_id: "app",
        type: InteractionType.MODAL_SUBMIT,
        token: "token",
        data: {
          custom_id: VERIFY_MODAL_PARTNER_ID,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: VERIFY_MODAL_HANDLE_FIELD,
                  value: "Test_Pilot",
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: VERIFY_MODAL_ORG_FIELD,
                  value: "ZAP",
                },
              ],
            },
          ],
        },
      },
      VERIFY_MODAL_ORG_FIELD,
    );

    expect(value).toBe("ZAP");
  });

  it("posts verify channel message via verify-setup", async () => {
    const api = createMockDiscordApi();
    const env = mockEnv({ VERIFY_CHANNEL_ID: "verify-ch-1" });
    const result = await handleVerifySetupCommand({
      env,
      api,
      interaction: {} as never,
      followUp: async () => {},
    });

    expect(result.ok).toBe(true);
    expect(api.postChannelMessage).toHaveBeenCalledWith(
      "verify-ch-1",
      buildVerifyChannelMessage(),
    );
  });

  it("returns channel post error when discord returns 403", async () => {
    const api = createMockDiscordApi();
    vi.mocked(api.postChannelMessage).mockRejectedValue(
      new DiscordApiError(
        "postChannelMessage",
        403,
        '{"message": "Missing Permissions", "code": 50013}',
        "postChannelMessage",
      ),
    );
    const result = await handleVerifySetupCommand({
      env: mockEnv({ VERIFY_CHANNEL_ID: "verify-ch-1" }),
      api,
      interaction: {} as never,
      followUp: async () => {},
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VERIFY_CHANNEL_POST_FAILED");
    }
  });

  it("scanz modal builder matches start button path", () => {
    const fromButton = handleVerifyStartButton(mockEnv(), {
      id: "1",
      application_id: "app",
      type: InteractionType.MESSAGE_COMPONENT,
      token: "token",
      guild_id: mockEnv().DISCORD_GUILD_ID,
      data: {
        custom_id: VERIFY_START_SCANZ_ID,
        component_type: 2,
      },
    });
    const direct = buildScanzVerifyModalResponse();

    expect(fromButton).toEqual(direct);
  });
});
