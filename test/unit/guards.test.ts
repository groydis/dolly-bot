import { describe, expect, it } from "vitest";
import { STAFF_ROLE_IDS } from "../../src/config/staff-roles";
import { requireGuild } from "../../src/guards/guild";
import { requireScanzRole } from "../../src/guards/scanz-role";
import { requireStaffRole } from "../../src/guards/staff-role";
import { isErr, isOk } from "../../src/lib/result";
import { TEST_ROLE_IDS } from "../helpers/mock-env";

const GUILD_ID = "guild-123";

describe("requireGuild", () => {
  it("returns NO_GUILD when guild_id missing", () => {
    const result = requireGuild({}, GUILD_ID);
    expect(isErr(result) && result.error.code).toBe("NO_GUILD");
  });

  it("returns WRONG_GUILD when id mismatches", () => {
    const result = requireGuild({ guild_id: "other" }, GUILD_ID);
    expect(isErr(result) && result.error.code).toBe("WRONG_GUILD");
  });

  it("returns ok when guild matches", () => {
    const result = requireGuild({ guild_id: GUILD_ID }, GUILD_ID);
    expect(isOk(result) && result.value).toBe(GUILD_ID);
  });
});

describe("requireScanzRole", () => {
  it("returns MISSING_SCANZ_ROLE when member undefined", () => {
    const result = requireScanzRole(undefined, TEST_ROLE_IDS.scanz);
    expect(isErr(result) && result.error.code).toBe("MISSING_SCANZ_ROLE");
  });

  it("returns MISSING_SCANZ_ROLE when role absent", () => {
    const result = requireScanzRole({ roles: [] }, TEST_ROLE_IDS.scanz);
    expect(isErr(result) && result.error.code).toBe("MISSING_SCANZ_ROLE");
  });

  it("returns ok when scanz role present", () => {
    const result = requireScanzRole(
      { roles: [TEST_ROLE_IDS.scanz] },
      TEST_ROLE_IDS.scanz,
    );
    expect(isOk(result)).toBe(true);
  });
});

describe("requireStaffRole", () => {
  it("returns MISSING_STAFF_ROLE when member undefined", () => {
    const result = requireStaffRole(undefined);
    expect(isErr(result) && result.error.code).toBe("MISSING_STAFF_ROLE");
  });

  it("returns MISSING_STAFF_ROLE when no staff role", () => {
    const result = requireStaffRole({ roles: [TEST_ROLE_IDS.scanz] });
    expect(isErr(result) && result.error.code).toBe("MISSING_STAFF_ROLE");
  });

  it("returns ok for admin role", () => {
    const result = requireStaffRole({ roles: [STAFF_ROLE_IDS[0]!] });
    expect(isOk(result)).toBe(true);
  });
});
