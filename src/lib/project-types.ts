/**
 * Single source of truth for project types and the "Event Details"
 * questions each one asks the client. Used by:
 *  - the vendor's New Project form (the dropdown)
 *  - the client's Event Details screen (essentials + type questions)
 *  - the vendor workspace (labels, completed summary)
 *
 * These questions collect PRACTICAL DELIVERY information only — never
 * price, deposit, package or payment method, which the vendor already
 * set. Kept short and conversational: ~6 shared essentials plus 3-6
 * type-specific questions, so no project ever asks more than ~12
 * questions in total, and no type ever sees another type's questions.
 */

export type DetailField = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'time'
  placeholder?: string
  options?: string[]
}

export type ProjectTypeInfo = {
  value: string
  label: string
  group: string
}

/** Every selectable type, grouped for a tidy dropdown. */
export const PROJECT_TYPES: ProjectTypeInfo[] = [
  { value: 'FAMILY_SESSION', label: 'Family session', group: 'Sessions' },
  { value: 'MATERNITY', label: 'Maternity', group: 'Sessions' },
  { value: 'NEWBORN', label: 'Newborn', group: 'Sessions' },
  { value: 'CAKE_SMASH', label: 'Cake smash', group: 'Sessions' },
  { value: 'FIRST_BIRTHDAY', label: 'First birthday', group: 'Sessions' },
  { value: 'MOTHERHOOD_JOURNEY', label: 'Motherhood journey', group: 'Sessions' },
  { value: 'PORTRAIT', label: 'Portrait', group: 'Sessions' },
  { value: 'WEDDING', label: 'Wedding', group: 'Weddings & ceremonies' },
  { value: 'INDIAN_CEREMONY', label: 'Indian ceremony', group: 'Weddings & ceremonies' },
  { value: 'VIDEOGRAPHY', label: 'Videography', group: 'Video' },
  { value: 'LIVE_STREAM', label: 'Live streaming', group: 'Video' },
  { value: 'DECOR', label: 'Decor & styling', group: 'Events' },
  { value: 'MAKEUP', label: 'Makeup & hair', group: 'Events' },
  { value: 'DJ', label: 'DJ / music', group: 'Events' },
  { value: 'EVENT_PLANNING', label: 'Event planning', group: 'Events' },
  { value: 'EVENT', label: 'General event', group: 'Events' },
  { value: 'OTHER', label: 'Other', group: 'Events' },
]

export function projectTypeLabel(value: string): string {
  return PROJECT_TYPES.find(t => t.value === value)?.label ?? 'Project'
}

/** Section heading shown above the type-specific questions. */
export function sectionLabelFor(type: string): string {
  return `${projectTypeLabel(type)} details`
}

/**
 * Shared with every project — the practical essentials, phrased as a
 * quick conversation rather than a form. Six questions, never more.
 */
export const BASE_DETAIL_FIELDS: DetailField[] = [
  { key: 'mainContact', label: 'Who should we contact on the day?', type: 'text', placeholder: 'Name' },
  { key: 'phone', label: 'Best phone number for the day', type: 'text', placeholder: '07…' },
  { key: 'date', label: 'Confirm your event date', type: 'date' },
  { key: 'time', label: 'What time does it start (and finish, if known)?', type: 'text', placeholder: 'e.g. 2:00pm – 6:00pm' },
  { key: 'venue', label: 'Confirm the venue or address', type: 'text', placeholder: 'Venue name and full address' },
  { key: 'notes', label: 'Anything we should know? (access needs, timing constraints, special requests)', type: 'textarea', placeholder: 'Optional, but helpful' },
]

const FAMILY: DetailField[] = [
  { key: 'participants', label: "Who's joining the session?", type: 'text', placeholder: 'Names and ages' },
  { key: 'style', label: 'What look are you going for?', type: 'select', options: ['Warm and natural', 'Bright and airy', 'Dark and moody', 'Classic', 'Not sure — guide me'] },
  { key: 'moodboard', label: 'Any outfit or colour preferences?', type: 'textarea', placeholder: 'A mood-board link works too' },
  { key: 'keyShots', label: 'Any must-have shots or combinations?', type: 'textarea' },
]

const MOTHERHOOD: DetailField[] = [
  { key: 'stages', label: "Which stage(s) are we capturing?", type: 'text', placeholder: 'e.g. 20 weeks, just after birth' },
  { key: 'participants', label: "Who's involved besides you?", type: 'text' },
  { key: 'style', label: 'Styling preferences?', type: 'select', options: ['Warm and natural', 'Bright and airy', 'Classic', 'Not sure — guide me'] },
  { key: 'moments', label: 'Important moments or comfort needs to plan for?', type: 'textarea' },
]

const WEDDING: DetailField[] = [
  { key: 'ceremonyReception', label: 'Ceremony and reception details', type: 'textarea', placeholder: 'Where and when each part happens' },
  { key: 'groups', label: 'Important family or group photo combinations', type: 'textarea' },
  { key: 'cultural', label: "Cultural, religious or key moments we shouldn't miss", type: 'textarea' },
  { key: 'restrictions', label: 'Any restrictions we should know about?', type: 'textarea', placeholder: 'Access limits, quiet moments, timing constraints' },
]

const VIDEOGRAPHY: DetailField[] = [
  { key: 'coverage', label: 'What do you need us to film?', type: 'textarea' },
  { key: 'keyMoments', label: 'Key moments to prioritise', type: 'textarea', placeholder: 'Speeches, first dance…' },
  { key: 'format', label: 'Preferred final format', type: 'select', options: ['Highlight film', 'Full-length edit', 'Social clips', 'Multiple formats'] },
  { key: 'delivery', label: 'How and when would you like it delivered?', type: 'textarea' },
]

const LIVE_STREAM: DetailField[] = [
  { key: 'platform', label: 'Which platform will you stream to?', type: 'select', options: ['YouTube', 'Facebook', 'Instagram', 'Zoom', 'Private link', 'Other'] },
  { key: 'internet', label: 'Internet availability at the venue', type: 'select', options: ['Reliable wired', 'Wi-Fi only', 'None — please provide', 'Not sure'] },
  { key: 'cameras', label: 'How many camera angles do you need?', type: 'select', options: ['1', '2', '3', '4+'] },
  { key: 'audience', label: 'Expected online audience', type: 'number', placeholder: 'Approximate viewers' },
  { key: 'technical', label: 'Any other technical details?', type: 'textarea', placeholder: 'Backup connection, power access, load-in time, privacy settings' },
]

const DECOR: DetailField[] = [
  { key: 'areas', label: 'Which areas need decorating?', type: 'textarea', placeholder: 'Entrance, stage, tables…' },
  { key: 'theme', label: 'Theme or colour direction', type: 'text', placeholder: 'e.g. Blush and gold' },
  { key: 'restrictions', label: 'Any venue restrictions?', type: 'textarea', placeholder: 'Fixings, candles, hanging limits' },
  { key: 'access', label: 'Setup, removal and access details', type: 'textarea', placeholder: 'Timings, loading, existing furniture' },
]

const MAKEUP: DetailField[] = [
  { key: 'serviceType', label: 'What service do you need?', type: 'select', options: ['Bridal', 'Special occasion', 'Editorial', 'Everyday glam', 'Other'] },
  { key: 'people', label: 'How many people?', type: 'number' },
  { key: 'readyBy', label: 'What time do you need to be ready by?', type: 'time' },
  { key: 'sensitivities', label: 'Any skin sensitivities or allergies?', type: 'textarea' },
  { key: 'inspiration', label: 'Hair services needed, or a look you love?', type: 'textarea', placeholder: 'Describe it or paste a link' },
]

const DJ: DetailField[] = [
  { key: 'eventType', label: 'What type of event is this?', type: 'text', placeholder: 'Wedding, birthday, corporate…' },
  { key: 'guestEstimate', label: 'Roughly how many guests?', type: 'number' },
  { key: 'setLength', label: 'How long should we play?', type: 'text', placeholder: 'e.g. 6pm – midnight' },
  { key: 'equipment', label: 'Any venue or equipment constraints?', type: 'textarea', placeholder: 'Power, space, noise limits' },
]

const EVENT_PLANNING: DetailField[] = [
  { key: 'eventType', label: 'What type of event is this?', type: 'text' },
  { key: 'guestEstimate', label: 'Roughly how many guests?', type: 'number' },
  { key: 'priorities', label: "What matters most to you for this event?", type: 'textarea' },
  { key: 'culturalReq', label: 'Any accessibility or cultural requirements?', type: 'textarea' },
]

const OTHER: DetailField[] = [
  { key: 'requirements', label: 'What do you need? Describe it in your own words.', type: 'textarea' },
]

const QUESTION_SETS: Record<string, DetailField[]> = {
  FAMILY_SESSION: FAMILY,
  MATERNITY: FAMILY,
  NEWBORN: FAMILY,
  CAKE_SMASH: FAMILY,
  FIRST_BIRTHDAY: FAMILY,
  PORTRAIT: FAMILY,
  MOTHERHOOD_JOURNEY: MOTHERHOOD,
  WEDDING,
  INDIAN_CEREMONY: WEDDING,
  VIDEOGRAPHY,
  LIVE_STREAM,
  DECOR,
  MAKEUP,
  DJ,
  EVENT_PLANNING,
  EVENT: EVENT_PLANNING,
  OTHER,
}

/** The type-specific questions for a given project type (never mixed). */
export function detailQuestionsFor(type: string): DetailField[] {
  return QUESTION_SETS[type] ?? OTHER
}

/** Full ordered field list (essentials + type-specific), e.g. for summaries. */
export function allDetailFields(type: string): DetailField[] {
  return [...BASE_DETAIL_FIELDS, ...detailQuestionsFor(type)]
}
