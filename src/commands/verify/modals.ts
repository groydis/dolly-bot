import type { ModalActionRow, ModalSubmitInteraction } from "../../discord/types";
import { ComponentType, TextInputStyle } from "../../discord/types";
import { modalResponse } from "../../discord/interactions";
import type { InteractionResponse } from "../../discord/types";
import {
  ORG_SYMBOL_MAX_LENGTH,
  RSI_HANDLE_MAX_LENGTH,
} from "../../lib/rsi-limits";
import {
  VERIFY_MODAL_HANDLE_FIELD,
  VERIFY_MODAL_ORG_FIELD,
  VERIFY_MODAL_PARTNER_ID,
  VERIFY_MODAL_SCANZ_ID,
} from "./constants";

export function buildScanzVerifyModalResponse(): InteractionResponse {
  return modalResponse({
    customId: VERIFY_MODAL_SCANZ_ID,
    title: "Verify with SCANZ",
    components: [
      {
        type: ComponentType.ACTION_ROW,
        components: [
          {
            type: ComponentType.TEXT_INPUT,
            custom_id: VERIFY_MODAL_HANDLE_FIELD,
            label: "RSI handle",
            style: TextInputStyle.SHORT,
            min_length: 3,
            max_length: RSI_HANDLE_MAX_LENGTH,
            placeholder: "Astro_Ferret",
            required: true,
          },
        ],
      },
    ],
  });
}

export function buildPartnerVerifyModalResponse(): InteractionResponse {
  return modalResponse({
    customId: VERIFY_MODAL_PARTNER_ID,
    title: "Verify with partner org",
    components: [
      {
        type: ComponentType.ACTION_ROW,
        components: [
          {
            type: ComponentType.TEXT_INPUT,
            custom_id: VERIFY_MODAL_HANDLE_FIELD,
            label: "RSI handle",
            style: TextInputStyle.SHORT,
            min_length: 3,
            max_length: RSI_HANDLE_MAX_LENGTH,
            placeholder: "Astro_Ferret",
            required: true,
          },
        ],
      },
      {
        type: ComponentType.ACTION_ROW,
        components: [
          {
            type: ComponentType.TEXT_INPUT,
            custom_id: VERIFY_MODAL_ORG_FIELD,
            label: "Org symbol",
            style: TextInputStyle.SHORT,
            min_length: 2,
            max_length: ORG_SYMBOL_MAX_LENGTH,
            placeholder: "ZAP",
            required: true,
          },
        ],
      },
    ],
  });
}

export function parseModalTextField(
  interaction: ModalSubmitInteraction,
  fieldId: string,
): string | undefined {
  for (const row of interaction.data.components) {
    for (const component of row.components) {
      if (component.custom_id === fieldId) {
        return component.value;
      }
    }
  }

  return undefined;
}

export function parseModalFields(
  components: ModalActionRow[],
): Map<string, string> {
  const fields = new Map<string, string>();

  for (const row of components) {
    for (const component of row.components) {
      fields.set(component.custom_id, component.value);
    }
  }

  return fields;
}
