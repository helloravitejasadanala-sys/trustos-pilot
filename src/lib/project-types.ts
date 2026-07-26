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
 * Shared essentials every vendor needs before quoting.
 * Prefill date/venue from the booking when known — client confirms.
 * Keep this short; type-specific questions stay ≤3.
 */
export const BASE_DETAIL_FIELDS: DetailField[] = [
  { key: 'mainContact', label: 'Who should we contact on the day?', type: 'text', placeholder: 'Name' },
  { key: 'phone', label: 'Best phone number for the day', type: 'text', placeholder: '07…' },
  { key: 'date', label: 'Confirm your event date', type: 'date' },
  { key: 'time', label: 'Start time (and finish, if known)', type: 'text', placeholder: 'e.g. 2:00pm – 6:00pm' },
  { key: 'venue', label: 'Confirm the venue or address', type: 'text', placeholder: 'Venue name and full address' },
  { key: 'notes', label: 'Anything else we should know?', type: 'textarea', placeholder: 'Optional — access, parking, quiet moments, special requests' },
]

/** Photography / family sessions — who, look, must-haves. */
const FAMILY: DetailField[] = [
  { key: 'participants', label: "Who's in the photos?", type: 'text', placeholder: 'Names and ages' },
  { key: 'style', label: 'What look are you going for?', type: 'select', options: ['Warm and natural', 'Bright and airy', 'Dark and moody', 'Classic', 'Not sure — guide me'] },
  { key: 'keyShots', label: 'Any must-have shots?', type: 'textarea', placeholder: 'Optional — group combos, outfits, mood-board link' },
]

const MOTHERHOOD: DetailField[] = [
  { key: 'stages', label: 'Which stage(s) are we capturing?', type: 'text', placeholder: 'e.g. 20 weeks, newborn week' },
  { key: 'participants', label: "Who's involved besides you?", type: 'text', placeholder: 'Partner, siblings…' },
  { key: 'moments', label: 'Comfort needs or moments to plan for?', type: 'textarea', placeholder: 'Optional' },
]

const WEDDING: DetailField[] = [
  { key: 'ceremonyReception', label: 'Ceremony and reception — where and when?', type: 'textarea', placeholder: 'Locations and rough times for each part' },
  { key: 'groups', label: 'Must-have group or family photos', type: 'textarea', placeholder: 'Optional but saves time on the day' },
  { key: 'cultural', label: "Key moments we must not miss", type: 'textarea', placeholder: 'Cultural, religious, speeches, first look…' },
]

const VIDEOGRAPHY: DetailField[] = [
  { key: 'coverage', label: 'What should we film?', type: 'textarea', placeholder: 'Full day, speeches only, ceremony…' },
  { key: 'keyMoments', label: 'Moments to prioritise', type: 'textarea', placeholder: 'First dance, vows, speeches…' },
  { key: 'format', label: 'Preferred final format', type: 'select', options: ['Highlight film', 'Full-length edit', 'Social clips', 'Multiple formats'] },
]

const LIVE_STREAM: DetailField[] = [
  { key: 'platform', label: 'Where will guests watch?', type: 'select', options: ['YouTube', 'Facebook', 'Instagram', 'Zoom', 'Private link', 'Other'] },
  { key: 'internet', label: 'Internet at the venue', type: 'select', options: ['Reliable wired', 'Wi-Fi only', 'None — please provide', 'Not sure'] },
  { key: 'cameras', label: 'Camera angles needed', type: 'select', options: ['1', '2', '3', '4+'] },
]

const DECOR: DetailField[] = [
  { key: 'areas', label: 'Which areas need decorating?', type: 'textarea', placeholder: 'Entrance, stage, tables…' },
  { key: 'theme', label: 'Theme or colour direction', type: 'text', placeholder: 'e.g. Blush and gold' },
  { key: 'access', label: 'Setup / removal timing and access', type: 'textarea', placeholder: 'Load-in, venue rules, existing furniture' },
]

const MAKEUP: DetailField[] = [
  { key: 'serviceType', label: 'What service do you need?', type: 'select', options: ['Bridal', 'Special occasion', 'Editorial', 'Everyday glam', 'Other'] },
  { key: 'people', label: 'How many people, and ready-by time?', type: 'text', placeholder: 'e.g. 3 people, ready by 1:30pm' },
  { key: 'sensitivities', label: 'Skin sensitivities, allergies, or look references?', type: 'textarea', placeholder: 'Optional — paste a link if you have one' },
]

/** DJ — music is the job; guest count + cues. Timing/venue live in essentials. */
const DJ: DetailField[] = [
  { key: 'guestEstimate', label: 'Roughly how many guests?', type: 'number', placeholder: 'e.g. 80' },
  { key: 'mustPlay', label: 'Must-play tracks or genres', type: 'textarea', placeholder: 'Songs, genres, or a playlist link' },
  { key: 'specialMoments', label: 'Special moments to cue', type: 'textarea', placeholder: 'First dance, entrances, cake cutting… (optional: do-not-play list)' },
]

const EVENT_PLANNING: DetailField[] = [
  { key: 'guestEstimate', label: 'Roughly how many guests?', type: 'number' },
  { key: 'priorities', label: 'What matters most for this event?', type: 'textarea' },
  { key: 'culturalReq', label: 'Accessibility or cultural requirements?', type: 'textarea', placeholder: 'Optional' },
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
