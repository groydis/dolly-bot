import type { ApplicationCommandOption, ChatInputCommandInteraction } from "../discord/types";

const STRING_OPTION_TYPE = 3;

function findOption(
  options: ApplicationCommandOption[] | undefined,
  name: string,
): ApplicationCommandOption | undefined {
  if (!options) {
    return undefined;
  }

  for (const option of options) {
    if (option.name === name) {
      return option;
    }

    if (option.options) {
      const nested = findOption(option.options, name);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

export function parseStringOption(
  interaction: ChatInputCommandInteraction,
  name: string,
): string | undefined {
  const option = findOption(interaction.data.options, name);
  if (!option) {
    return undefined;
  }

  if (typeof option.value === "string") {
    const trimmed = option.value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (option.type === STRING_OPTION_TYPE && option.value != null) {
    const asString = String(option.value).trim();
    return asString.length > 0 ? asString : undefined;
  }

  return undefined;
}

export function parseStringOptionAliases(
  interaction: ChatInputCommandInteraction,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = parseStringOption(interaction, name);
    if (value) {
      return value;
    }
  }

  return undefined;
}
