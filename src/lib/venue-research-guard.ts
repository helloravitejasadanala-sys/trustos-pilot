/**
 * Block venue-research free text that names or describes people.
 * Places only — unconsented third parties are a legal risk at campaign scale.
 */

export const PLACES_NOT_PEOPLE_REASON = 'Venue notes describe the place, not people.'

/** Patterns that strongly suggest a person, role-as-person, or personal attack. */
const PERSON_PATTERNS: RegExp[] = [
  /\b(manager|coordinator|planner|owner|receptionist|bartender|waiter|waitress|usher|security\s*guard|dj\s*named)\b/i,
  /\b(staff\s*member|the\s+staff|venue\s+team|their\s+team)\b/i,
  /\b(he|she|they)\s+(was|were|is|are|said|told|refused|yelled|ignored|helped|was\s+rude)\b/i,
  /\b(called|named)\s+[A-Z][a-z]{1,20}\b/,
  /\b(mr|mrs|ms|miss|dr)\.?\s+[A-Z][a-z]+\b/i,
  /\b(rude|unhelpful|hostile|aggressive|incompetent|nasty)\b/i,
  /\b(don'?t\s+trust|avoid)\s+(him|her|them|the\s+\w+)\b/i,
]

export function looksLikePersonDescription(text: string | null | undefined): boolean {
  const t = (text || '').trim()
  if (!t) return false
  return PERSON_PATTERNS.some(re => re.test(t))
}

/** First field that fails, for error UX. */
export function firstPersonLikeField(
  fields: Record<string, string | null | undefined>,
): string | null {
  for (const [key, value] of Object.entries(fields)) {
    if (looksLikePersonDescription(value)) return key
  }
  return null
}
