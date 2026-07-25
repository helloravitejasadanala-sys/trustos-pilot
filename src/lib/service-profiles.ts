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

export const SERVICE_KEYS = ['PHOTOGRAPHY', 'LIVE_STREAMING', 'MAKEUP_ARTIST', 'DJ'] as const
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
    questionnaireSectionLabel: 'Music preferences',
    depositLabel: 'Deposit',
    questionnaireExtras: [
      {
        key: 'mustPlay',
        label: 'Must-play tracks or genres',
        type: 'textarea',
        placeholder: 'Songs, genres, or a playlist link',
      },
      {
        key: 'doNotPlay',
        label: 'Do-not-play list',
        type: 'textarea',
        placeholder: 'Optional',
      },
      {
        key: 'specialMoments',
        label: 'Special moments to cue',
        type: 'textarea',
        placeholder: 'First dance, entrances, cake cutting…',
      },
    ],
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
}

export function isServiceKey(value: unknown): value is ServiceKey {
  return typeof value === 'string' && (SERVICE_KEYS as readonly string[]).includes(value)
}

export function getServiceProfile(service?: string | null): ServiceProfile {
  if (isServiceKey(service)) return SERVICE_PROFILES[service]
  return SERVICE_PROFILES.PHOTOGRAPHY
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

/** Essentials + service extras + type-specific questions (never mixed across services). */
export function allDetailFieldsForService(projectType: string, service?: string | null): DetailField[] {
  const profile = getServiceProfile(service)
  return [
    ...BASE_DETAIL_FIELDS,
    ...profile.questionnaireExtras,
    ...detailQuestionsFor(projectType),
  ]
}

export function detailQuestionsForService(projectType: string, service?: string | null): DetailField[] {
  const profile = getServiceProfile(service)
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
    return 'Prep'
  }
  if (tab === 'Delivery') {
    const stage = profile.stages.find(s => s.key === 'delivery')?.label || 'Delivery'
    if (/recording/i.test(stage)) return 'Recording'
    if (/gallery/i.test(stage)) return 'Gallery'
    return 'Delivery'
  }
  return tab
}

export function prepFieldLabels(
  key: PrepFieldKey,
  service?: string | null,
): { label: string; placeholder?: string } {
  const profile = getServiceProfile(service)
  switch (key) {
    case 'eventDate':
      return { label: 'Date & time' }
    case 'location':
      return {
        label: profile.key === 'LIVE_STREAMING' ? 'Venue / stream location' : 'Location',
        placeholder: 'Venue or address',
      }
    case 'moodboard':
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
  return 'Save preparation'
}

export function deliveryLockedCopy(service?: string | null): string {
  const kind = getServiceProfile(service).features.deliverableKind
  if (kind === 'recording') return 'Recording links unlock after the live event.'
  return 'Gallery links unlock after the shoot.'
}

export function deliveryOpenCopy(service?: string | null): { title: string; addLabel: string } {
  const kind = getServiceProfile(service).features.deliverableKind
  if (kind === 'recording') {
    return { title: 'Recording', addLabel: 'Add recording link' }
  }
  return { title: 'Gallery', addLabel: 'Add gallery link' }
}
