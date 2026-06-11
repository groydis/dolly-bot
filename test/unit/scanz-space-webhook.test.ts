import { afterEach, describe, expect, it, vi } from "vitest";

import { notifyVerifyComplete } from "../../src/integrations/scanz-space";
import type { Env } from "../../src/env";

const baseEnv = {
  SCANZ_SPACE_INTERNAL_URL: "https://scanz.space",
  SCANZ_SPACE_INTERNAL_SECRET: "test-secret",
} as Env;

describe("notifyVerifyComplete", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips when webhook env is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await notifyVerifyComplete({} as Env, {
      discordId: "123",
      rsiHandle: "Pilot",
      orgSid: "SCANZ",
      verifyPath: "scanz",
      roles: ["role-1"],
      guildId: "guild-1",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts verify-complete payload when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await notifyVerifyComplete(baseEnv, {
      discordId: "123",
      rsiHandle: "Pilot",
      orgSid: "SCANZ",
      verifyPath: "partner",
      roles: ["role-1", "role-2"],
      guildId: "guild-1",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://scanz.space/api/internal/discord/verify-complete");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-secret",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      discordId: "123",
      rsiHandle: "Pilot",
      orgSid: "SCANZ",
      verifyPath: "partner",
      roles: ["role-1", "role-2"],
      guildId: "guild-1",
    });
  });
});
