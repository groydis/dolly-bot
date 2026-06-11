import { upsertVerifyRecord } from "../../db/verify-records";
import type { VerifyPath } from "../../db/verify-records";
import type { Env } from "../../env";
import { notifyVerifyComplete } from "../../integrations/scanz-space";
import { deleteVerifySession } from "../../lib/verify-session";
import { buildVerifySuccessMessage } from "./format";
import type { VerifyOutcome } from "./rsi/types";

export async function finalizeVerification(input: {
  env: Env;
  sessionId: string;
  discordUserId: string;
  handle: string;
  verifyPath: VerifyPath;
  orgSid: string;
  nickname: string;
  affiliateOnly: boolean;
  grantedRoles: readonly string[];
  partnerOrgRoleId: string | null;
  discordRoleIds?: readonly string[];
  guildId?: string;
  outcome: Omit<
    VerifyOutcome,
    "path" | "handle" | "orgSid" | "nickname" | "affiliateOnly"
  >;
}): Promise<string> {
  await upsertVerifyRecord(input.env.VERIFY_DB, {
    discordUserId: input.discordUserId,
    rsiHandle: input.handle,
    verifyPath: input.verifyPath,
    orgSid: input.orgSid,
    grantedRoles: input.grantedRoles,
    partnerOrgRoleId: input.partnerOrgRoleId,
  });

  if (input.guildId && input.discordRoleIds) {
    void notifyVerifyComplete(input.env, {
      discordId: input.discordUserId,
      rsiHandle: input.handle,
      orgSid: input.orgSid,
      verifyPath: input.verifyPath,
      roles: [...input.discordRoleIds],
      guildId: input.guildId,
    });
  }

  await deleteVerifySession(input.env.VERIFY_KV, input.sessionId);

  return buildVerifySuccessMessage({
    path: input.verifyPath,
    handle: input.handle,
    orgSid: input.orgSid,
    nickname: input.nickname,
    affiliateOnly: input.affiliateOnly,
    ...input.outcome,
  });
}
