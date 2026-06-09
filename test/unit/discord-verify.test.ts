import { describe, expect, it } from "vitest";
import { verifyDiscordRequest } from "../../src/discord/verify";

const PUBLIC_KEY =
  "0000000000000000000000000000000000000000000000000000000000000000";

describe("verifyDiscordRequest", () => {
  it("returns false when signature is missing", async () => {
    await expect(
      verifyDiscordRequest("{}", null, "1710000000", PUBLIC_KEY),
    ).resolves.toBe(false);
  });

  it("returns false when timestamp is missing", async () => {
    await expect(
      verifyDiscordRequest("{}", "abc123", null, PUBLIC_KEY),
    ).resolves.toBe(false);
  });

  it("returns false for garbage signature without throwing", async () => {
    await expect(
      verifyDiscordRequest(
        "{}",
        "not-a-valid-signature",
        "1710000000",
        PUBLIC_KEY,
      ),
    ).resolves.toBe(false);
  });
});
