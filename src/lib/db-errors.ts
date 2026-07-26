/**
 * Detect infrastructure / connection failures so UI never blames the booking
 * or the user's permissions when the database is unavailable.
 */
export function isDbInfrastructureError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '')
  const code = String((err as any)?.code || '')
  return (
    /EMAXCONN|max clients|P1001|P1017|P2024|Can't reach database|timed out|timeout|connection|ECONNREFUSED|ECONNRESET|pool/i.test(
      msg,
    ) ||
    code.startsWith('P1') ||
    code === 'P2024'
  )
}

export const DB_UNAVAILABLE_USER_MESSAGE =
  'Something went wrong, please try again.'
