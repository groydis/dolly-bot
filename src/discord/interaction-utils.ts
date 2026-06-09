import type {
  ChatInputCommandInteraction,
  ComponentInteraction,
} from "./types";

/** Delay before PATCH follow-up so Discord finishes processing the deferred ack. */
export const DEFER_ACK_DELAY_MS = 250;

type InteractionWithUser = Pick<
  ChatInputCommandInteraction | ComponentInteraction,
  "member" | "user"
>;

export function getInteractionUserId(
  interaction: InteractionWithUser,
): string | undefined {
  return interaction.member?.user?.id ?? interaction.user?.id;
}
