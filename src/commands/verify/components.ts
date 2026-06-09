import type { ActionRow } from "../../discord/types";
import { VERIFY_BUTTON_PREFIX } from "./constants";

export function buildVerifyButton(sessionId: string): ActionRow[] {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          label: "Verify",
          custom_id: `${VERIFY_BUTTON_PREFIX}${sessionId}`,
        },
      ],
    },
  ];
}
