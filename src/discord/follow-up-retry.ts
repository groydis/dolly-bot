import { FOLLOW_UP_RETRY_DELAY_MS } from "./constants";

export function followUpRetryDelayMs(attempt: number): number | null {
  if (attempt <= 1) {
    return null;
  }

  return FOLLOW_UP_RETRY_DELAY_MS * attempt;
}
