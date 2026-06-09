export type AppError =
  | { code: "NO_GUILD" }
  | { code: "WRONG_GUILD" }
  | { code: "MISSING_SCANZ_ROLE" }
  | { code: "NOT_IN_VOICE" }
  | { code: "INVALID_VOICE_CHANNEL" }
  | { code: "UNKNOWN_ACTIVITY" }
  | { code: "MISSING_DESCRIPTION" }
  | { code: "UNKNOWN_COMMAND" }
  | { code: "POST_FAILED" }
  | { code: "VOICE_LOOKUP_FAILED" }
  | { code: "VOICE_CHANNEL_ACCESS_DENIED" }
  | { code: "COOLDOWN_ACTIVE"; seconds: number }
  | { code: "INVALID_RSI_HANDLE" }
  | { code: "VERIFY_SESSION_EXPIRED" }
  | { code: "VERIFY_SESSION_NOT_FOUND" }
  | { code: "VERIFY_WRONG_USER" }
  | { code: "RSI_HANDLE_NOT_FOUND" }
  | { code: "VERIFY_CODE_NOT_IN_BIO"; orgSid: string }
  | { code: "INVALID_ORG_SYMBOL" }
  | { code: "VERIFY_ORG_PROVISION_FAILED" }
  | { code: "VERIFY_HANDLE_MISMATCH" }
  | { code: "RSI_FETCH_FAILED" }
  | { code: "VERIFY_DISCORD_UPDATE_FAILED"; partnerRosterMiss?: boolean; orgSid?: string };

export function errorToMessage(error: AppError): string {
  switch (error.code) {
    case "NO_GUILD":
      return "This command only works inside the SCANZ server.";
    case "WRONG_GUILD":
      return "This bot only works in the SCANZ server.";
    case "MISSING_SCANZ_ROLE":
      return "You need the SCANZ role to use /ping.";
    case "NOT_IN_VOICE":
      return [
        "You need to be in a voice channel before using /ping.",
        "",
        "Jump into a VC first, then run the command again so people know where to join you.",
      ].join("\n");
    case "INVALID_VOICE_CHANNEL":
      return [
        "You need to be in an active voice channel (not AFK or a stage) before using /ping.",
        "",
        "Join a regular voice channel, then run the command again.",
      ].join("\n");
    case "UNKNOWN_ACTIVITY":
      return "That activity is not configured yet.";
    case "MISSING_DESCRIPTION":
      return "Please add a description so people know what you're doing.";
    case "UNKNOWN_COMMAND":
      return "That command is not supported.";
    case "POST_FAILED":
      return "I could not send the ping. Please check my channel permissions.";
    case "VOICE_LOOKUP_FAILED":
      return [
        "I could not check your voice channel. Please try again in a moment.",
        "",
        "If this keeps happening, ask an admin to give the bot **View Channel** and **Connect** on voice channels.",
      ].join("\n");
    case "VOICE_CHANNEL_ACCESS_DENIED":
      return [
        "I can see you're in a voice channel, but I don't have permission to access it.",
        "",
        "Ask an admin to give the dolly-bot role **View Channel** and **Connect** on voice channels (or re-invite the bot with updated permissions).",
      ].join("\n");
    case "COOLDOWN_ACTIVE": {
      const minutes = Math.ceil(error.seconds / 60);
      return `You can only use /ping once every ${minutes} minutes. Please wait a bit before trying again.`;
    }
    case "INVALID_RSI_HANDLE":
      return "That doesn't look like a valid RSI handle.";
    case "INVALID_ORG_SYMBOL":
      return "That doesn't look like a valid RSI org symbol (2–10 letters, numbers, or underscores).";
    case "VERIFY_SESSION_EXPIRED":
      return "Your verification code expired. Run `/verify` again.";
    case "VERIFY_SESSION_NOT_FOUND":
      return "That verification session is no longer valid. Run `/verify` again.";
    case "VERIFY_WRONG_USER":
      return "This verification isn't yours.";
    case "RSI_HANDLE_NOT_FOUND":
      return "No RSI profile found for that handle.";
    case "VERIFY_CODE_NOT_IN_BIO":
      return `I couldn't find your code in your bio yet. Add \`[${error.orgSid}: …]\` and click Verify again.`;
    case "VERIFY_HANDLE_MISMATCH":
      return "The handle on your RSI profile doesn't match what you entered.";
    case "RSI_FETCH_FAILED":
      return "Couldn't reach RSI right now. Try again in a moment.";
    case "VERIFY_DISCORD_UPDATE_FAILED": {
      const lines: string[] = [];
      if (error.partnerRosterMiss && error.orgSid) {
        lines.push(`Not found on **${error.orgSid}** org roster.`);
        lines.push("");
      }
      lines.push(
        "Verified on RSI but couldn't update your Discord roles. Contact an admin.",
      );
      return lines.join("\n");
    }
    case "VERIFY_ORG_PROVISION_FAILED":
      return "Verified on RSI but couldn't set up your org role or channel. Contact an admin.";
  }
}
