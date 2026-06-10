import type { ChannelMessagePayload } from "../../discord/types";
import { RSI_PROFILE_EDIT_URL, VERIFY_CHANNEL_EMBED_COLOR } from "./constants";
import { buildVerifyChannelStartButtons } from "./components";

export function buildVerifyChannelMessage(): ChannelMessagePayload {
  return {
    embeds: [
      {
        title: "RSI verification",
        description: [
          "Link your Discord account to your Roberts Space Industries profile to receive roles and the correct nickname.",
          "",
          "**How it works**",
          `1. Choose **Verify with SCANZ** or **Verify with partner org** below.`,
          `2. Enter your RSI handle (and org symbol for partner orgs).`,
          `3. Add the verification line to your RSI short bio: ${RSI_PROFILE_EDIT_URL}`,
          "4. Click **Verify** on the private message the bot sends you.",
          "",
          "You can also use `/verify` anytime — both paths use the same verification process.",
        ].join("\n"),
        color: VERIFY_CHANNEL_EMBED_COLOR,
      },
    ],
    components: buildVerifyChannelStartButtons(),
    allowed_mentions: { parse: [] },
  };
}
