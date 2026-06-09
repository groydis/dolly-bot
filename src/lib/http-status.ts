export const HttpStatus = {
  OK: 200,
  ACCEPTED: 202,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
  METHOD_NOT_ALLOWED: 405,
} as const;

export function isHttpOk(status: number): boolean {
  return status === HttpStatus.OK;
}
