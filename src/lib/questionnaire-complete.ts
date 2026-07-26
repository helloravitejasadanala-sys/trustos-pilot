/** Essentials that must be filled before a client can confirm event details. */
export const REQUIRED_DETAIL_KEYS = ['mainContact', 'phone', 'date', 'venue'] as const

export function missingRequiredDetails(answers: Record<string, unknown>): string[] {
  return REQUIRED_DETAIL_KEYS.filter(key => {
    const v = answers[key]
    if (v == null) return true
    if (typeof v === 'string') return v.trim().length === 0
    return false
  })
}
