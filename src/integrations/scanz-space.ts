import type { Env } from "../env";
import type { VerifyPath } from "../db/verify-records";

export type VerifyCompleteWebhookPayload = {
  discordId: string;
  rsiHandle: string;
  orgSid: string;
  verifyPath: VerifyPath;
  roles: string[];
  guildId: string;
  orgName?: string;
};

export async function notifyVerifyComplete(
  env: Env,
  payload: VerifyCompleteWebhookPayload,
): Promise<void> {
  const baseUrl = env.SCANZ_SPACE_INTERNAL_URL?.trim();
  const secret = env.SCANZ_SPACE_INTERNAL_SECRET?.trim();

  if (!baseUrl || !secret) {
    return;
  }

  const url = `${baseUrl.replace(/\/$/, "")}/api/internal/discord/verify-complete`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        JSON.stringify({
          source: "scanz_space_webhook",
          level: "error",
          status: response.status,
          body: text.slice(0, 500),
        }),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        source: "scanz_space_webhook_failed",
        level: "error",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
