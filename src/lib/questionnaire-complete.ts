import { requiredDetailKeysForService } from '@/lib/service-profiles'

/** @deprecated Prefer requiredDetailKeysForService(service) — kept for callers without a service. */
export const REQUIRED_DETAIL_KEYS = ['mainContact', 'phone', 'date', 'venue'] as const

export function missingRequiredDetails(
  answers: Record<string, unknown>,
  service?: string | null,
): string[] {
  const keys = requiredDetailKeysForService(service)
  return keys.filter(key => {
    const v = answers[key]
    if (v == null) return true
    if (typeof v === 'string') return v.trim().length === 0
    return false
  })
}
