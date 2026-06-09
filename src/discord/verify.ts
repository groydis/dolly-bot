import { verifyKey } from "discord-interactions";

export async function verifyDiscordRequest(
  body: string,
  signature: string | null,
  timestamp: string | null,
  publicKey: string,
): Promise<boolean> {
  if (!signature || !timestamp) {
    return false;
  }

  return verifyKey(body, signature, timestamp, publicKey);
}
