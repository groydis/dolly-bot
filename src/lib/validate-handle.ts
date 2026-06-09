const RSI_HANDLE_PATTERN = /^[A-Za-z0-9_]{3,32}$/;

export function isValidRsiHandle(handle: string): boolean {
  return RSI_HANDLE_PATTERN.test(handle);
}
