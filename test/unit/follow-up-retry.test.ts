import { describe, expect, it } from "vitest";
import { followUpRetryDelayMs } from "../../src/discord/follow-up-retry";

describe("followUpRetryDelayMs", () => {
  it("returns null for the first attempt", () => {
    expect(followUpRetryDelayMs(1)).toBeNull();
  });

  it("scales delay by attempt number", () => {
    expect(followUpRetryDelayMs(2)).toBe(600);
    expect(followUpRetryDelayMs(3)).toBe(900);
    expect(followUpRetryDelayMs(4)).toBe(1200);
    expect(followUpRetryDelayMs(5)).toBe(1500);
  });
});
