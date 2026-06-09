import type { ActionRow } from "../../discord/types";
import { ButtonStyle, ComponentType } from "../../discord/types";
import { VERIFY_BUTTON_PREFIX } from "./constants";

export function buildVerifyButton(sessionId: string): ActionRow[] {
  return [
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          label: "Verify",
          custom_id: `${VERIFY_BUTTON_PREFIX}${sessionId}`,
        },
      ],
    },
  ];
}
