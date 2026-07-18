/**
 * Stage 5 — one platform, different defaults by category.
 *
 * This does NOT create separate apps. It configures labels and the
 * default dashboard cards a vendor sees, matching how each trade
 * actually talks about their work. The category is inferred from the
 * vendor's projects/type, with a sensible fallback.
 */

export type CategoryConfig = {
  key: string
  label: string
  // The default "at a glance" cards for this category's dashboard.
  cards: string[]
  // What this trade calls an upcoming booking.
  bookingWord: string
}

export const CATEGORIES: Record<string, CategoryConfig> = {
  wedding_photographer: {
    key: 'wedding_photographer',
    label: 'Wedding photography',
    bookingWord: 'weddings',
    cards: ['Upcoming weddings', 'Timelines', 'Shot lists', 'Balances due', 'Galleries', 'Albums'],
  },
  family_photographer: {
    key: 'family_photographer',
    label: 'Family & newborn photography',
    bookingWord: 'sessions',
    cards: ['Upcoming sessions', 'Parent questionnaires', 'Preparation guides', 'Mood boards', 'Galleries', 'Print orders'],
  },
  makeup_artist: {
    key: 'makeup_artist',
    label: 'Makeup artistry',
    bookingWord: 'appointments',
    cards: ['Upcoming appointments', 'Trials', 'Look boards', 'Client notes', 'Balances due'],
  },
  dj: {
    key: 'dj',
    label: 'DJ',
    bookingWord: 'events',
    cards: ['Upcoming events', 'Music preferences', 'Venue information', 'Equipment checklist', 'Balances due'],
  },
  planner: {
    key: 'planner',
    label: 'Event planning',
    bookingWord: 'events',
    cards: ['Active events', 'Suppliers', 'Approvals', 'Timelines', 'Outstanding tasks'],
  },
  live_streaming: {
    key: 'live_streaming',
    label: 'Live streaming',
    bookingWord: 'streams',
    cards: ['Upcoming streams', 'Internet checks', 'Equipment', 'Crew', 'Stream tests', 'Recording delivery'],
  },
  general: {
    key: 'general',
    label: 'Creative services',
    bookingWord: 'projects',
    cards: ['Upcoming projects', 'Questionnaires', 'Proposals', 'Balances due', 'Deliverables'],
  },
}

/**
 * Infer a category from what we know about the vendor. Deliberately
 * simple: match the business name / project types against keywords,
 * fall back to 'general'. The category could later be a stored field.
 */
export function inferCategory(input: {
  businessName?: string | null
  projectTypes?: string[]
}): CategoryConfig {
  const hay = (input.businessName ?? '').toLowerCase()
  const types = (input.projectTypes ?? []).map(t => t.toUpperCase())

  if (/stream|live/.test(hay)) return CATEGORIES.live_streaming
  if (/makeup|make-up|mua|beauty/.test(hay)) return CATEGORIES.makeup_artist
  if (/\bdj\b|disco|music/.test(hay)) return CATEGORIES.dj
  if (/plann/.test(hay)) return CATEGORIES.planner
  if (/wedding/.test(hay) || types.includes('WEDDING')) return CATEGORIES.wedding_photographer
  if (types.some(t => ['MATERNITY', 'NEWBORN', 'CAKE_SMASH', 'FIRST_BIRTHDAY', 'PORTRAIT'].includes(t)))
    return CATEGORIES.family_photographer
  if (/momentz|photo/.test(hay)) return CATEGORIES.family_photographer

  return CATEGORIES.general
}
