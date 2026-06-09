import { describe, expect, it } from "vitest";
import { type AppError, errorToMessage } from "../../src/errors";

const ERROR_CASES: AppError[] = [
  { code: "NO_GUILD" },
  { code: "WRONG_GUILD" },
  { code: "MISSING_SCANZ_ROLE" },
  { code: "NOT_IN_VOICE" },
  { code: "INVALID_VOICE_CHANNEL" },
  { code: "UNKNOWN_ACTIVITY" },
  { code: "MISSING_DESCRIPTION" },
  { code: "UNKNOWN_COMMAND" },
  { code: "POST_FAILED" },
  { code: "VOICE_LOOKUP_FAILED" },
  { code: "VOICE_CHANNEL_ACCESS_DENIED" },
  { code: "COOLDOWN_ACTIVE", seconds: 90 },
  { code: "INVALID_RSI_HANDLE" },
  { code: "VERIFY_SESSION_EXPIRED" },
  { code: "VERIFY_SESSION_NOT_FOUND" },
  { code: "VERIFY_WRONG_USER" },
  { code: "RSI_HANDLE_NOT_FOUND" },
  { code: "VERIFY_CODE_NOT_IN_BIO", orgSid: "SCANZ" },
  { code: "INVALID_ORG_SYMBOL" },
  { code: "VERIFY_ORG_PROVISION_FAILED" },
  { code: "VERIFY_HANDLE_MISMATCH" },
  { code: "RSI_FETCH_FAILED" },
  { code: "VERIFY_DISCORD_UPDATE_FAILED" },
  {
    code: "VERIFY_DISCORD_UPDATE_FAILED",
    partnerRosterMiss: true,
    orgSid: "ZAP",
  },
  { code: "MISSING_STAFF_ROLE" },
  { code: "AUDIT_RECORD_NOT_FOUND" },
  { code: "AUDIT_FAILED" },
];

describe("errorToMessage", () => {
  it.each(ERROR_CASES)("returns non-empty message for $code", (error) => {
    const message = errorToMessage(error);
    expect(message.length).toBeGreaterThan(0);
  });

  it("formats cooldown minutes", () => {
    expect(errorToMessage({ code: "COOLDOWN_ACTIVE", seconds: 90 })).toContain(
      "2 minutes",
    );
  });

  it("includes org sid in verify code message", () => {
    expect(
      errorToMessage({ code: "VERIFY_CODE_NOT_IN_BIO", orgSid: "SCANZ" }),
    ).toContain("SCANZ");
  });

  it("includes partner roster miss in discord update failed", () => {
    const message = errorToMessage({
      code: "VERIFY_DISCORD_UPDATE_FAILED",
      partnerRosterMiss: true,
      orgSid: "ZAP",
    });
    expect(message).toContain("ZAP");
    expect(message).toContain("org roster");
  });
});
