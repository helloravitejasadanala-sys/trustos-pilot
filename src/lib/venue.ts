/**
 * Shared venue matching helpers. Every Collect/Search caller must use these —
 * never re-implement normalize logic elsewhere.
 */

/** Trim, lowercase, collapse internal whitespace. Empty/whitespace → "". */
export function normalizeVenueKey(raw: string | null | undefined): string {
  if (raw == null) return ''
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Same normalize for city; unknown city is "". */
export function normalizeCity(raw: string | null | undefined): string {
  return normalizeVenueKey(raw)
}
