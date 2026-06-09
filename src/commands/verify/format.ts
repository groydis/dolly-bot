import { RSI_PROFILE_EDIT_URL } from "./constants";

export function buildVerifyInstructions(handle: string, code: string): string {
  return [
    `**RSI verification for \`${handle}\`**`,
    "",
    `1. Open your RSI profile: ${RSI_PROFILE_EDIT_URL}`,
    "2. Add this line to the bottom of your short bio and save:",
    "",
    `\`[SCANZ: ${code}]\``,
    "",
    "3. Click **Verify** below when you're done.",
  ].join("\n");
}

export function buildVerifySuccessMessage(
  handle: string,
  affiliateOnly: boolean,
): string {
  if (affiliateOnly) {
    return `Verified as affiliate — nickname set to \`${handle}\`.`;
  }

  return `Verified! Welcome to SCANZ — roles updated and nickname set to \`${handle}\`.`;
}
