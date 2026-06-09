import { ok, type Result } from "../../lib/result";
import type { AppError } from "../../errors";
import type { CommandContext, FollowUpPayload } from "../types";
import { buildPingHelpMessage } from "./format";

export async function handlePingHelpCommand(
  _context: CommandContext,
): Promise<Result<FollowUpPayload, AppError>> {
  return ok({ content: buildPingHelpMessage() });
}
