import { describe, expect, it } from "vitest";
import {
  computePartnerRoleSyncPlan,
  computeScanzRoleSyncPlan,
  diffRoleIds,
  resolvePartnerAffiliateOnlyRoleIds,
} from "../../src/commands/verify/role-sync";
import { mockEnv, TEST_ROLE_IDS } from "../helpers/mock-env";

const env = mockEnv();

describe("diffRoleIds", () => {
  it("computes add and remove sets", () => {
    const current = new Set(["a", "b"]);
    const desired = new Set(["b", "c"]);
    expect(diffRoleIds(current, desired)).toEqual({
      add: ["c"],
      remove: ["a"],
    });
  });

  it("returns empty when sets match", () => {
    const ids = new Set(["a"]);
    expect(diffRoleIds(ids, ids)).toEqual({ add: [], remove: [] });
  });
});

describe("computeScanzRoleSyncPlan", () => {
  it("adds missing target roles", () => {
    const plan = computeScanzRoleSyncPlan(
      env,
      ["scanz", "verified"],
      [],
    );
    expect(plan.rolesToAdd).toEqual([
      TEST_ROLE_IDS.scanz,
      TEST_ROLE_IDS.verified,
    ]);
    expect(plan.rolesNeedingReview).toHaveLength(0);
  });

  it("flags excess @SCANZ for review on affiliate-only target", () => {
    const plan = computeScanzRoleSyncPlan(
      env,
      ["affiliate"],
      [TEST_ROLE_IDS.scanz, TEST_ROLE_IDS.verified],
    );
    expect(plan.scanzMembershipReviewNeeded).toBe(true);
    expect(plan.rolesToAdd).toEqual([TEST_ROLE_IDS.affiliate]);
    expect(plan.rolesNeedingReview.map((r) => r.roleId)).toContain(
      TEST_ROLE_IDS.scanz,
    );
    expect(plan.rolesNeedingReview.map((r) => r.roleId)).toContain(
      TEST_ROLE_IDS.verified,
    );
  });
});

describe("resolvePartnerAffiliateOnlyRoleIds", () => {
  it("adds affiliate when member has no global roles", () => {
    expect(resolvePartnerAffiliateOnlyRoleIds(env, [])).toEqual([
      TEST_ROLE_IDS.affiliate,
    ]);
  });

  it("skips add when affiliate already present", () => {
    expect(
      resolvePartnerAffiliateOnlyRoleIds(env, [TEST_ROLE_IDS.affiliate]),
    ).toEqual([]);
  });

  it("skips add when verified or scanz present", () => {
    expect(
      resolvePartnerAffiliateOnlyRoleIds(env, [TEST_ROLE_IDS.verified]),
    ).toEqual([]);
  });
});

describe("computePartnerRoleSyncPlan", () => {
  const guildRoles = [
    { id: TEST_ROLE_IDS.orgZap, name: "org_zap" },
    { id: "5555555555555555555", name: "org_other" },
  ];

  it("adds partner roles when verified on roster", () => {
    const plan = computePartnerRoleSyncPlan({
      env,
      guildRoles,
      currentRoleIds: [],
      orgRoleId: TEST_ROLE_IDS.orgZap,
      affiliateOnly: false,
      orgSid: "ZAP",
    });
    expect(plan.rolesToAdd).toEqual([
      TEST_ROLE_IDS.affiliate,
      TEST_ROLE_IDS.verified,
      TEST_ROLE_IDS.orgZap,
    ]);
  });

  it("affiliate-only flags wrong org_* roles and skips verified/org add", () => {
    const plan = computePartnerRoleSyncPlan({
      env,
      guildRoles,
      currentRoleIds: [TEST_ROLE_IDS.orgZap],
      orgRoleId: TEST_ROLE_IDS.orgZap,
      affiliateOnly: true,
      orgSid: "ZAP",
    });
    expect(plan.rolesToAdd).toEqual([TEST_ROLE_IDS.affiliate]);
    expect(plan.rolesNeedingReview[0]?.roleId).toBe(TEST_ROLE_IDS.orgZap);
  });
});
