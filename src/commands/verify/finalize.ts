import { upsertVerifyRecord } from "../../db/verify-records";
import type { VerifyPath } from "../../db/verify-records";
import type { Env } from "../../env";
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
