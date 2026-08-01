/**
 * Service Profiles — one platform, profile-driven defaults.
 *
 * Every workspace picks one Primary Service at onboarding. That profile
 * configures questionnaire copy, journey stages, prep checklist, deliverables,
 * and which vendor sections are visible. Shared product surfaces (login,
 * clients, projects, messages, payments, Today, workspace) stay the same.
 *
 * Add a new service by appending a profile here — do not fork apps.
 */

import type { DetailField } from '@/lib/project-types'
import { BASE_DETAIL_FIELDS, PROJECT_TYPES, detailQuestionsFor } from '@/lib/project-types'

export const SERVICE_KEYS = [
  'PHOTOGRAPHY',
  'LIVE_STREAMING',
  'MAKEUP_ARTIST',
  'DJ',
  'PHOTO_EDITOR',
  'VIDEO_EDITOR',
] as const
export type ServiceKey = (typeof SERVICE_KEYS)[number]

export type PrepFieldKey = 'eventDate' | 'location' | 'moodboard' | 'notes' | 'equipment' | 'music'
export type DeliverableKind = 'gallery' | 'recording' | 'none'

/** Progress keys used across profiles (subset per service). */
export type ProfileStageKey =
  | 'created'
  | 'questionnaire'
  | 'quote'
  | 'deposit'
  | 'prep'
  | 'service'
  | 'editing'
  | 'delivery'
  | 'approved'
  | 'archived'

export type ProfileStage = {
  key: ProfileStageKey
  label: string
  doneLabel: string
}

export type ServiceFeatures = {
  showPrep: boolean
  showDelivery: boolean
  showGallery: boolean
  showEditing: boolean
  showTechnicalRequirements: boolean
  showMusicPreferences: boolean
  showApproval: boolean
  prepFields: PrepFieldKey[]
  deliverableKind: DeliverableKind
}

export type ServiceProfile = {
  key: ServiceKey
  label: string
  description: string
  allowedProjectTypes: string[]
  defaultProjectType: string
  questionnaireLabel: string
  questionnaireSectionLabel: string
  depositLabel: string
  /** Extra questionnaire fields always asked for this service (before type-specific). */
  questionnaireExtras: DetailField[]
  /**
   * When set, replaces BASE + extras + type (max 8). Used by remote editor profiles.
   * Unset = existing BASE + extras + type composition.
   */
  questionnaireFields?: DetailField[]
  /** Required answer keys to complete the questionnaire. Default: mainContact, phone, date, venue. */
  requiredDetailKeys?: string[]
  stages: ProfileStage[]
  features: ServiceFeatures
  /** Overrides for journey next-action copy (status → fields). */
  actionCopy: Partial<
    Record<
      string,
      { label?: string; nextAction?: string; ctaLabel?: string }
    >
  >
}

const PHOTO_TYPES = [
  'FAMILY_SESSION', 'MATERNITY', 'NEWBORN', 'CAKE_SMASH', 'FIRST_BIRTHDAY',
  'MOTHERHOOD_JOURNEY', 'PORTRAIT', 'WEDDING', 'INDIAN_CEREMONY', 'OTHER',
]

const STREAM_TYPES = ['LIVE_STREAM', 'EVENT', 'WEDDING', 'INDIAN_CEREMONY', 'OTHER']
const MAKEUP_TYPES = ['MAKEUP', 'WEDDING', 'INDIAN_CEREMONY', 'EVENT', 'OTHER']
const DJ_TYPES = ['DJ', 'WEDDING', 'INDIAN_CEREMONY', 'EVENT', 'EVENT_PLANNING', 'OTHER']
const PHOTO_EDITOR_TYPES = ['PHOTO_EDIT', 'OTHER']
const VIDEO_EDITOR_TYPES = ['VIDEO_EDIT', 'VIDEOGRAPHY', 'OTHER']

const PHOTO_EDITOR_QUESTIONNAIRE: DetailField[] = [
  {
    key: 'mainContact',
    label: 'Who signs off the exports?',
    type: 'text',
    placeholder: 'Name',
  },
  {
    key: 'phone',
    label: 'Best number for deadline questions',
    type: 'text',
    placeholder: '07…',
  },
  { key: 'date', label: 'Delivery deadline', type: 'date' },
  {
    key: 'sourceVolume',
    label: 'Rough volume to edit',
    type: 'text',
    placeholder: 'e.g. 200 selects, or full card dump',
  },
  {
    key: 'deliverableFormat',
    label: 'Export type',
    type: 'select',
    options: ['Web gallery', 'Print-ready files', 'Both', 'Other'],
  },
  {
    key: 'colorStyle',
    label: 'Colour treatment',
    type: 'select',
    options: ['Natural', 'Film', 'High contrast', 'Match my references', 'Not sure — guide me'],
  },
  {
    key: 'revisionRounds',
    label: 'Revisions included',
    type: 'select',
    options: ['1 round', '2 rounds', '3 rounds', 'Discuss in the quote'],
  },
  {
    key: 'notes',
    label: 'Additional instructions',
    type: 'textarea',
    placeholder: 'Transfer links, brand rules, must-keep shots, naming…',
  },
]

const VIDEO_EDITOR_QUESTIONNAIRE: DetailField[] = [
  {
    key: 'mainContact',
    label: 'Who signs off the cut?',
    type: 'text',
    placeholder: 'Name',
  },
  {
    key: 'phone',
    label: 'Best number for deadline questions',
    type: 'text',
    placeholder: '07…',
  },
  { key: 'date', label: 'Delivery deadline', type: 'date' },
  {
    key: 'footageVolume',
    label: 'Footage volume',
    type: 'text',
    placeholder: 'e.g. 4 hours, or 2 cards',
  },
  {
    key: 'format',
    label: 'Final format',
    type: 'select',
    options: ['Highlight film', 'Full-length edit', 'Social clips', 'Multiple formats'],
  },
  {
    key: 'targetLength',
    label: 'Target finished length',
    type: 'text',
    placeholder: 'e.g. 3–5 min highlight, or 20 min film',
  },
  {
    key: 'musicLicensing',
    label: 'Music',
    type: 'select',
    options: ['Client provides music', 'Need licensed tracks', 'Mixed — discuss'],
  },
  {
    key: 'notes',
    label: 'Additional instructions',
    type: 'textarea',
    placeholder: 'Transfer links, brand refs, revision notes, must-include moments…',
  },
]

export const SERVICE_PROFILES: Record<ServiceKey, ServiceProfile> = {
  PHOTOGRAPHY: {
    key: 'PHOTOGRAPHY',
    label: 'Photography',
    description: 'Sessions, weddings, and portrait work with gallery delivery.',
    allowedProjectTypes: PHOTO_TYPES,
    defaultProjectType: 'FAMILY_SESSION',
    questionnaireLabel: 'Session details',
    questionnaireSectionLabel: 'About the session',
    depositLabel: 'Deposit',
    questionnaireExtras: [],
    stages: [
      { key: 'created', label: 'Created', doneLabel: 'Created' },
      { key: 'questionnaire', label: 'Details', doneLabel: 'Details confirmed' },
      { key: 'quote', label: 'Quote', doneLabel: 'Quote accepted' },
      { key: 'deposit', label: 'Deposit', doneLabel: 'Deposit received' },
      { key: 'prep', label: 'Preparation', doneLabel: 'Preparation done' },
      { key: 'service', label: 'Shoot', doneLabel: 'Shoot completed' },
      { key: 'editing', label: 'Editing', doneLabel: 'Editing done' },
      { key: 'delivery', label: 'Gallery', doneLabel: 'Gallery sent' },
      { key: 'approved', label: 'Completed', doneLabel: 'Completed' },
      { key: 'archived', label: 'Archived', doneLabel: 'Archived' },
    ],
    features: {
      showPrep: true,
      showDelivery: true,
      showGallery: true,
      showEditing: true,
      showTechnicalRequirements: false,
      showMusicPreferences: false,
      showApproval: true,
      prepFields: ['eventDate', 'location', 'moodboard', 'notes'],
      deliverableKind: 'gallery',
    },
    actionCopy: {
      QUESTIONNAIRE_COMPLETED: {
        label: 'Details in',
        nextAction: 'Review session details and send the quote',
        ctaLabel: 'Review details →',
      },
      DEPOSIT_PAID: {
        nextAction: 'Prepare for the shoot',
        ctaLabel: 'Open preparation →',
      },
      FULLY_PAID: {
        nextAction: 'Send the gallery',
        ctaLabel: 'Add gallery →',
      },
      COMPLETED: {
        nextAction: 'Send the gallery or request a review',
        ctaLabel: 'Open delivery →',
      },
    },
  },

  LIVE_STREAMING: {
    key: 'LIVE_STREAMING',
    label: 'Live Streaming',
    description: 'Event streams with technical setup and recording delivery.',
    allowedProjectTypes: STREAM_TYPES,
    defaultProjectType: 'LIVE_STREAM',
    questionnaireLabel: 'Event Details',
    questionnaireSectionLabel: 'Technical requirements',
    depositLabel: 'Deposit',
    questionnaireExtras: [],
    stages: [
      { key: 'created', label: 'Created', doneLabel: 'Created' },
      { key: 'questionnaire', label: 'Event Details', doneLabel: 'Details confirmed' },
      { key: 'quote', label: 'Quote', doneLabel: 'Quote accepted' },
      { key: 'deposit', label: 'Deposit', doneLabel: 'Deposit received' },
      { key: 'prep', label: 'Equipment Preparation', doneLabel: 'Equipment ready' },
      { key: 'service', label: 'Live Event', doneLabel: 'Live event done' },
      { key: 'delivery', label: 'Recording Delivery', doneLabel: 'Recording delivered' },
      { key: 'approved', label: 'Completed', doneLabel: 'Completed' },
      { key: 'archived', label: 'Archived', doneLabel: 'Archived' },
    ],
    features: {
      showPrep: true,
      showDelivery: true,
      showGallery: true,
      showEditing: false,
      showTechnicalRequirements: true,
      showMusicPreferences: false,
      showApproval: true,
      prepFields: ['eventDate', 'location', 'equipment', 'notes'],
      deliverableKind: 'recording',
    },
    actionCopy: {
      QUESTIONNAIRE_COMPLETED: {
        label: 'Event details done',
        nextAction: 'Review technical requirements and send the quote',
        ctaLabel: 'Review details →',
      },
      DEPOSIT_PAID: {
        nextAction: 'Prepare streaming equipment',
        ctaLabel: 'Open preparation →',
      },
      FULLY_PAID: {
        nextAction: 'Deliver the recording',
        ctaLabel: 'Add recording →',
      },
      COMPLETED: {
        nextAction: 'Deliver the recording or request a review',
        ctaLabel: 'Open delivery →',
      },
    },
  },

  MAKEUP_ARTIST: {
    key: 'MAKEUP_ARTIST',
    label: 'Makeup Artist',
    description: 'Bookings, look discussion, and appointment completion.',
    allowedProjectTypes: MAKEUP_TYPES,
    defaultProjectType: 'MAKEUP',
    questionnaireLabel: 'Booking Details',
    questionnaireSectionLabel: 'Look preferences',
    depositLabel: 'Advance',
    questionnaireExtras: [],
    stages: [
      { key: 'created', label: 'Created', doneLabel: 'Created' },
      { key: 'questionnaire', label: 'Booking Details', doneLabel: 'Booking confirmed' },
      { key: 'quote', label: 'Quote', doneLabel: 'Quote accepted' },
      { key: 'deposit', label: 'Advance', doneLabel: 'Advance received' },
      { key: 'prep', label: 'Look Discussion', doneLabel: 'Look agreed' },
      { key: 'service', label: 'Appointment', doneLabel: 'Appointment done' },
      { key: 'approved', label: 'Completed', doneLabel: 'Completed' },
      { key: 'archived', label: 'Archived', doneLabel: 'Archived' },
    ],
    features: {
      showPrep: true,
      showDelivery: false,
      showGallery: false,
      showEditing: false,
      showTechnicalRequirements: false,
      showMusicPreferences: false,
      showApproval: false,
      prepFields: ['eventDate', 'location', 'notes', 'moodboard'],
      deliverableKind: 'none',
    },
    actionCopy: {
      QUESTIONNAIRE_COMPLETED: {
        label: 'Booking details done',
        nextAction: 'Review booking details and send the quote',
        ctaLabel: 'Review booking →',
      },
      PROPOSAL_ACCEPTED: {
        nextAction: 'Send the agreement for the advance',
        ctaLabel: 'Send agreement →',
      },
      DEPOSIT_PAID: {
        nextAction: 'Confirm the look with your client',
        ctaLabel: 'Open look discussion →',
      },
      FULLY_PAID: {
        nextAction: 'Mark the appointment complete',
        ctaLabel: 'Complete appointment →',
      },
      COMPLETED: {
        nextAction: 'Request a review',
        ctaLabel: 'Request review →',
      },
    },
  },

  DJ: {
    key: 'DJ',
    label: 'DJ',
    description: 'Events with music preferences, prep, and performance.',
    allowedProjectTypes: DJ_TYPES,
    defaultProjectType: 'DJ',
    questionnaireLabel: 'Event Details',
    questionnaireSectionLabel: 'Music & guests',
    depositLabel: 'Deposit',
    // Music questions live on the DJ project type (kept short — no duplicate extras).
    questionnaireExtras: [],
    stages: [
      { key: 'created', label: 'Created', doneLabel: 'Created' },
      { key: 'questionnaire', label: 'Event Details', doneLabel: 'Details confirmed' },
      { key: 'quote', label: 'Quote', doneLabel: 'Quote accepted' },
      { key: 'deposit', label: 'Deposit', doneLabel: 'Deposit received' },
      { key: 'prep', label: 'Music Prep', doneLabel: 'Music prep done' },
      { key: 'service', label: 'Performance', doneLabel: 'Performance done' },
      { key: 'approved', label: 'Completed', doneLabel: 'Completed' },
      { key: 'archived', label: 'Archived', doneLabel: 'Archived' },
    ],
    features: {
      showPrep: true,
      showDelivery: false,
      showGallery: false,
      showEditing: false,
      showTechnicalRequirements: false,
      showMusicPreferences: true,
      showApproval: false,
      prepFields: ['eventDate', 'location', 'music', 'notes'],
      deliverableKind: 'none',
    },
    actionCopy: {
      QUESTIONNAIRE_COMPLETED: {
        label: 'Music preferences in',
        nextAction: 'Review music preferences and send the quote',
        ctaLabel: 'Review details →',
      },
      DEPOSIT_PAID: {
        nextAction: 'Prepare for the performance',
        ctaLabel: 'Open preparation →',
      },
      FULLY_PAID: {
        nextAction: 'Mark the performance complete',
        ctaLabel: 'Complete performance →',
      },
      COMPLETED: {
        nextAction: 'Request a review',
        ctaLabel: 'Request review →',
      },
    },
  },

  PHOTO_EDITOR: {
    key: 'PHOTO_EDITOR',
    label: 'Photo Editor',
    description: 'Remote photo editing with briefs, revisions, and export delivery.',
    allowedProjectTypes: PHOTO_EDITOR_TYPES,
    defaultProjectType: 'PHOTO_EDIT',
    questionnaireLabel: 'Edit brief',
    questionnaireSectionLabel: 'Edit brief',
    depositLabel: 'Deposit',
    questionnaireExtras: [],
    questionnaireFields: PHOTO_EDITOR_QUESTIONNAIRE,
    requiredDetailKeys: ['mainContact', 'phone', 'date', 'sourceVolume'],
    stages: [
      { key: 'created', label: 'Created', doneLabel: 'Created' },
      { key: 'questionnaire', label: 'Edit brief', doneLabel: 'Brief confirmed' },
      { key: 'quote', label: 'Quote', doneLabel: 'Quote accepted' },
      { key: 'deposit', label: 'Deposit', doneLabel: 'Deposit received' },
      { key: 'prep', label: 'Footage and brief', doneLabel: 'Footage and brief ready' },
      { key: 'service', label: 'Editing', doneLabel: 'Editing done' },
      { key: 'delivery', label: 'Exports', doneLabel: 'Exports sent' },
      { key: 'approved', label: 'Completed', doneLabel: 'Completed' },
      { key: 'archived', label: 'Archived', doneLabel: 'Archived' },
    ],
    features: {
      showPrep: true,
      showDelivery: true,
      showGallery: true,
      showEditing: false,
      showTechnicalRequirements: false,
      showMusicPreferences: false,
      showApproval: true,
      prepFields: ['eventDate', 'location', 'moodboard', 'notes'],
      deliverableKind: 'gallery',
    },
    actionCopy: {
      QUESTIONNAIRE_COMPLETED: {
        label: 'Brief in',
        nextAction: 'Review the edit brief and send the quote',
        ctaLabel: 'Review brief →',
      },
      DEPOSIT_PAID: {
        nextAction: 'Confirm footage and references',
        ctaLabel: 'Open footage and brief →',
      },
      FULLY_PAID: {
        nextAction: 'Send the exports',
        ctaLabel: 'Add export link →',
      },
      COMPLETED: {
        nextAction: 'Send exports or request a review',
        ctaLabel: 'Open exports →',
      },
    },
  },

  VIDEO_EDITOR: {
    key: 'VIDEO_EDITOR',
    label: 'Video Editor',
    description: 'Remote video editing with briefs, revisions, and final-cut delivery.',
    allowedProjectTypes: VIDEO_EDITOR_TYPES,
    defaultProjectType: 'VIDEO_EDIT',
    questionnaireLabel: 'Edit brief',
    questionnaireSectionLabel: 'Edit brief',
    depositLabel: 'Deposit',
    questionnaireExtras: [],
    questionnaireFields: VIDEO_EDITOR_QUESTIONNAIRE,
    requiredDetailKeys: ['mainContact', 'phone', 'date', 'footageVolume'],
    stages: [
      { key: 'created', label: 'Created', doneLabel: 'Created' },
      { key: 'questionnaire', label: 'Edit brief', doneLabel: 'Brief confirmed' },
      { key: 'quote', label: 'Quote', doneLabel: 'Quote accepted' },
      { key: 'deposit', label: 'Deposit', doneLabel: 'Deposit received' },
      { key: 'prep', label: 'Footage and brief', doneLabel: 'Footage and brief ready' },
      { key: 'service', label: 'Editing', doneLabel: 'Editing done' },
      { key: 'delivery', label: 'Final cut', doneLabel: 'Final cut sent' },
      { key: 'approved', label: 'Completed', doneLabel: 'Completed' },
      { key: 'archived', label: 'Archived', doneLabel: 'Archived' },
    ],
    features: {
      showPrep: true,
      showDelivery: true,
      showGallery: true,
      showEditing: false,
      showTechnicalRequirements: false,
      showMusicPreferences: false,
      showApproval: true,
      prepFields: ['eventDate', 'location', 'moodboard', 'notes'],
      deliverableKind: 'gallery',
    },
    actionCopy: {
      QUESTIONNAIRE_COMPLETED: {
        label: 'Brief in',
        nextAction: 'Review the edit brief and send the quote',
        ctaLabel: 'Review brief →',
      },
      DEPOSIT_PAID: {
        nextAction: 'Confirm footage and references',
        ctaLabel: 'Open footage and brief →',
      },
      FULLY_PAID: {
        nextAction: 'Send the final cut',
        ctaLabel: 'Add final cut link →',
      },
      COMPLETED: {
        nextAction: 'Send the final cut or request a review',
        ctaLabel: 'Open final cut →',
      },
    },
  },
}

export function isServiceKey(value: unknown): value is ServiceKey {
  return typeof value === 'string' && (SERVICE_KEYS as readonly string[]).includes(value)
}

export function getServiceProfile(service?: string | null): ServiceProfile {
  if (isServiceKey(service)) return SERVICE_PROFILES[service]
  return SERVICE_PROFILES.PHOTOGRAPHY
}

/** Booking service wins; workspace primary is the fallback for older rows. */
export function resolveBookingService(
  projectService?: string | null,
  vendorPrimary?: string | null,
): ServiceKey {
  return getServiceProfile(projectService || vendorPrimary).key
}

export function serviceOptions(): Array<{ value: ServiceKey; label: string; description: string }> {
  return SERVICE_KEYS.map(key => ({
    value: key,
    label: SERVICE_PROFILES[key].label,
    description: SERVICE_PROFILES[key].description,
  }))
}

export function projectTypesForService(service?: string | null) {
  const profile = getServiceProfile(service)
  const allowed = new Set(profile.allowedProjectTypes)
  return PROJECT_TYPES.filter(t => allowed.has(t.value))
}

export function defaultProjectTypeForService(service?: string | null) {
  return getServiceProfile(service).defaultProjectType
}

/** Default required keys when a profile does not set requiredDetailKeys. */
export const DEFAULT_REQUIRED_DETAIL_KEYS = ['mainContact', 'phone', 'date', 'venue'] as const

export function requiredDetailKeysForService(service?: string | null): string[] {
  const profile = getServiceProfile(service)
  return profile.requiredDetailKeys ?? [...DEFAULT_REQUIRED_DETAIL_KEYS]
}

/**
 * Essentials + service extras + type-specific questions (never mixed across services).
 * When profile.questionnaireFields is set, that list alone is used (≤8, no BASE stack).
 */
export function allDetailFieldsForService(projectType: string, service?: string | null): DetailField[] {
  const profile = getServiceProfile(service)
  if (profile.questionnaireFields?.length) return profile.questionnaireFields
  return [
    ...BASE_DETAIL_FIELDS,
    ...profile.questionnaireExtras,
    ...detailQuestionsFor(projectType),
  ]
}

export function detailQuestionsForService(projectType: string, service?: string | null): DetailField[] {
  const profile = getServiceProfile(service)
  if (profile.questionnaireFields?.length) return []
  return [...profile.questionnaireExtras, ...detailQuestionsFor(projectType)]
}

export function sectionLabelForService(projectType: string, service?: string | null): string {
  return getServiceProfile(service).questionnaireSectionLabel || `${projectType} details`
}

export function journeyStagesForService(service?: string | null): ProfileStage[] {
  return getServiceProfile(service).stages.filter(s => s.key !== 'archived')
}

export function vendorTabsForService(service?: string | null): string[] {
  const f = getServiceProfile(service).features
  const tabs = ['Overview', 'Money']
  if (f.showPrep) tabs.push('Prep')
  if (f.showDelivery) tabs.push('Delivery')
  tabs.push('Chat')
  return tabs
}

/** Short tab labels — ids stay Overview/Money/Prep/Delivery/Chat. */
export function vendorTabLabel(tab: string, service?: string | null): string {
  const profile = getServiceProfile(service)
  if (tab === 'Prep') {
    const stage = profile.stages.find(s => s.key === 'prep')?.label || 'Prep'
    if (/look/i.test(stage)) return 'Look'
    if (/equipment/i.test(stage)) return 'Equipment'
    if (/music/i.test(stage)) return 'Music'
    if (/footage/i.test(stage)) return 'Footage'
    return 'Prep'
  }
  if (tab === 'Delivery') {
    const stage = profile.stages.find(s => s.key === 'delivery')?.label || 'Delivery'
    if (/recording/i.test(stage)) return 'Recording'
    if (/gallery/i.test(stage)) return 'Gallery'
    if (/export/i.test(stage)) return 'Exports'
    if (/final cut/i.test(stage)) return 'Final cut'
    return 'Delivery'
  }
  return tab
}

export function prepFieldLabels(
  key: PrepFieldKey,
  service?: string | null,
): { label: string; placeholder?: string } {
  const profile = getServiceProfile(service)
  const isEditor = profile.key === 'PHOTO_EDITOR' || profile.key === 'VIDEO_EDITOR'
  switch (key) {
    case 'eventDate':
      if (isEditor) return { label: 'Deadline' }
      return { label: 'Date & time' }
    case 'location':
      if (isEditor) {
        return {
          label: 'Footage transfer (link)',
          placeholder: 'Dropbox, Drive, WeTransfer…',
        }
      }
      return {
        label: profile.key === 'LIVE_STREAMING' ? 'Venue / stream location' : 'Location',
        placeholder: 'Venue or address',
      }
    case 'moodboard':
      if (profile.key === 'PHOTO_EDITOR') {
        return {
          label: 'Reference stills / grade refs',
          placeholder: 'https://…',
        }
      }
      if (profile.key === 'VIDEO_EDITOR') {
        return {
          label: 'Reference grade / refs',
          placeholder: 'https://…',
        }
      }
      return {
        label: profile.key === 'MAKEUP_ARTIST' ? 'Look inspiration link' : 'Moodboard / inspiration link',
        placeholder: 'https://…',
      }
    case 'notes':
      if (profile.key === 'MAKEUP_ARTIST') {
        return { label: 'Look notes', placeholder: 'Skin type, preferences, trial notes…' }
      }
      if (profile.key === 'LIVE_STREAMING') {
        return { label: 'Tech notes', placeholder: 'Power, internet, run-of-show…' }
      }
      if (profile.key === 'DJ') {
        return { label: 'Event notes', placeholder: 'Timings, MC cues, access…' }
      }
      if (isEditor) {
        return {
          label: 'Brief notes',
          placeholder: 'Revision rules, naming, must-keep moments…',
        }
      }
      return { label: 'Notes', placeholder: 'Timings, access, anything to remember' }
    case 'equipment':
      return { label: 'Equipment checklist', placeholder: 'Cameras, encoders, backup internet…' }
    case 'music':
      return { label: 'Music / set notes', placeholder: 'Playlist links, cue sheets…' }
    default:
      return { label: key }
  }
}

export function prepSaveLabel(service?: string | null): string {
  const key = getServiceProfile(service).key
  if (key === 'MAKEUP_ARTIST') return 'Save look notes'
  if (key === 'LIVE_STREAMING') return 'Save equipment prep'
  if (key === 'DJ') return 'Save event prep'
  if (key === 'PHOTO_EDITOR' || key === 'VIDEO_EDITOR') return 'Save footage and brief'
  return 'Save preparation'
}

export function deliveryLockedCopy(service?: string | null): string {
  const key = getServiceProfile(service).key
  if (key === 'PHOTO_EDITOR') return 'Export links unlock after editing starts.'
  if (key === 'VIDEO_EDITOR') return 'Final cut links unlock when exports are ready.'
  const kind = getServiceProfile(service).features.deliverableKind
  if (kind === 'recording') return 'Recording links unlock after the live event.'
  return 'Gallery links unlock after the shoot.'
}

export function deliveryOpenCopy(service?: string | null): { title: string; addLabel: string } {
  const key = getServiceProfile(service).key
  if (key === 'PHOTO_EDITOR') {
    return { title: 'Exports', addLabel: 'Add export link' }
  }
  if (key === 'VIDEO_EDITOR') {
    return { title: 'Final cut', addLabel: 'Add final cut link' }
  }
  const kind = getServiceProfile(service).features.deliverableKind
  if (kind === 'recording') {
    return { title: 'Recording', addLabel: 'Add recording link' }
  }
  return { title: 'Gallery', addLabel: 'Add gallery link' }
}

/** Client portal label for delivered files. */
export function clientFilesLabel(service?: string | null): string {
  const key = getServiceProfile(service).key
  if (key === 'PHOTO_EDITOR') return 'Your exports'
  if (key === 'VIDEO_EDITOR') return 'Your cut'
  const kind = getServiceProfile(service).features.deliverableKind
  if (kind === 'recording') return 'Your recording'
  return 'Your gallery'
}
