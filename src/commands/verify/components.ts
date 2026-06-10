import type { ActionRow } from "../../discord/types";
import { ButtonStyle, ComponentType } from "../../discord/types";
import {
  VERIFY_BUTTON_PREFIX,
  VERIFY_START_PARTNER_ID,
  VERIFY_START_SCANZ_ID,
} from "./constants";

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

export function buildVerifyChannelStartButtons(): ActionRow[] {
  return [
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          label: "Verify with SCANZ",
          custom_id: VERIFY_START_SCANZ_ID,
        },
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.SECONDARY,
          label: "Verify with partner org",
          custom_id: VERIFY_START_PARTNER_ID,
        },
      ],
    },
  ];
}
