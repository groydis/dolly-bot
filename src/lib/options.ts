import type { ApplicationCommandOption, ChatInputCommandInteraction } from "../discord/types";

function findOption(
  options: ApplicationCommandOption[] | undefined,
  name: string,
): ApplicationCommandOption | undefined {
  return options?.find((option) => option.name === name);
}

export function parseStringOption(
  interaction: ChatInputCommandInteraction,
  name: string,
): string | undefined {
  const option = findOption(interaction.data.options, name);
  if (!option || option.type !== 3) {
    return undefined;
  }

  return option.value;
}
