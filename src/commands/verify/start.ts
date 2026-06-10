import type { AppError } from "../../errors";
import {
  isValidOrgSymbol,
  normalizeOrgSymbol,
} from "../../lib/org-symbol";
import { err, ok, type Result } from "../../lib/result";
import { createVerifySession } from "../../lib/verify-session";
import { isValidRsiHandle } from "../../lib/validate-handle";
import type { FollowUpPayload } from "../types";
import { buildVerifyButton } from "./components";
import { buildVerifyInstructions } from "./format";

export async function startVerificationSession(
  kv: KVNamespace,
  discordUserId: string,
  rawHandle: string,
  rawOrg: string | null | undefined,
): Promise<Result<FollowUpPayload, AppError>> {
  const handle = rawHandle.trim();
  if (!handle || !isValidRsiHandle(handle)) {
    return err({ code: "INVALID_RSI_HANDLE" });
  }

  if (rawOrg !== null && rawOrg !== undefined) {
    const orgInput = rawOrg.trim();
    if (!orgInput || !isValidOrgSymbol(orgInput)) {
      return err({ code: "INVALID_ORG_SYMBOL" });
    }
  }

  const orgSid = normalizeOrgSymbol(rawOrg?.trim() || undefined);
  const session = await createVerifySession(kv, discordUserId, handle, orgSid);

  return ok({
    content: buildVerifyInstructions(handle, orgSid, session.code),
    components: buildVerifyButton(session.sessionId),
  });
}
