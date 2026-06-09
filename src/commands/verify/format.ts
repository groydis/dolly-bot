import { isScanzPath } from "../../lib/org-symbol";
import { RSI_PROFILE_EDIT_URL } from "./constants";
import type { VerifyOutcome } from "./rsi/types";

export function buildVerifyInstructions(
  handle: string,
  orgSid: string,
  code: string,
): string {
  const lines = [`**RSI verification for \`${handle}\`**`];
  if (!isScanzPath(orgSid)) {
    lines.push(`Partner org: **${orgSid}**`);
  }
  lines.push(
    "",
    `1. Open your RSI profile: ${RSI_PROFILE_EDIT_URL}`,
    "2. Add this line to the bottom of your short bio and save:",
    "",
    `\`[${orgSid}: ${code}]\``,
    "",
    "3. Click **Verify** below when you're done.",
  );
  return lines.join("\n");
}

function roleReviewNotice(outcome: VerifyOutcome): string[] {
  if (!outcome.roleReviewNeeded) {
    return [];
  }

  if (outcome.scanzRoleReviewNeeded) {
    return [];
  }

  return [
    "",
    "Some existing roles were flagged for staff review and were not changed.",
  ];
}

export function buildVerifySuccessMessage(outcome: VerifyOutcome): string {
  const { orgSid, nickname } = outcome;

  if (outcome.path === "scanz") {
    if (outcome.scanzRoleReviewNeeded) {
      return [
        "Verified as affiliate — we couldn't confirm SCANZ membership on RSI.",
        "",
        "Your existing SCANZ roles are unchanged while staff review your membership.",
        "",
        "**To get full SCANZ roles:** apply to join SCANZ on RSI, then run `/verify` again.",
        "**If you're in a partner org:** run `/verify handle:YourHandle org:YOURORG` (e.g. `org:ZAP`).",
        "",
        `Nickname set to \`${nickname}\`.`,
      ].join("\n");
    }

    if (outcome.affiliateOnly) {
      const lines = [
        "Verified as affiliate — we couldn't confirm SCANZ membership (your org may be hidden, or you may not be on the roster yet).",
        "",
        "**To get full SCANZ roles:** apply to join SCANZ on RSI, then run `/verify` again.",
        "**If you're in a partner org:** run `/verify handle:YourHandle org:YOURORG` (e.g. `org:ZAP`).",
        "",
        `Nickname set to \`${nickname}\`.`,
        ...roleReviewNotice(outcome),
      ];
      return lines.join("\n");
    }

    const lines = [
      `Verified! Welcome to SCANZ — roles updated and nickname set to \`${nickname}\`.`,
      ...roleReviewNotice(outcome),
    ];
    return lines.join("\n");
  }

  if (outcome.affiliateOnly) {
    const lines = [
      `Verified as affiliate — we couldn't confirm **${orgSid}** membership. Double-check the org symbol and try again, or contact an admin if your roster is hidden.`,
      "",
      `Nickname set to \`${nickname}\`.`,
      ...roleReviewNotice(outcome),
    ];
    return lines.join("\n");
  }

  const lines = [
    `Verified for **${orgSid}** — roles updated and nickname set to \`${nickname}\`.`,
    outcome.channelName
      ? `Your org channel is **#${outcome.channelName}**.`
      : "",
    ...roleReviewNotice(outcome),
  ];

  return lines.filter(Boolean).join("\n");
}
