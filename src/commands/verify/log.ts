export function verifyLog(
  event: string,
  data: Record<string, unknown> = {},
): void {
  console.log("Verify", { event, ...data });
}

export function verifyError(
  event: string,
  data: Record<string, unknown> = {},
): void {
  console.error("Verify", { event, ...data });
}

export function formatUnknownError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error as { status?: number; body?: string; operation?: string }),
    };
  }

  return { error };
}
