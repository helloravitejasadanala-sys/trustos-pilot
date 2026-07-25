import { getNextAction } from '@/lib/journey'
import {
  getServiceProfile,
  journeyStagesForService,
  type ProfileStageKey,
  type ServiceKey,
} from '@/lib/service-profiles'

export type VendorProject = {
  id: string
  title: string
  slug: string
  status: string
  type: string | null
  eventDate: string | null
  location: string | null
  notes: string | null
  client: { id?: string; name: string | null; email?: string | null } | null
  invitation?: { url: string; expiresAt: string; openedAt: string | null; email: string | null; expired: boolean } | null
  updatedAt?: string
  lastClientMessageAt?: string | null
  payments?: { id?: string; type?: string; status?: string; amount?: number | string; method?: string | null }[] | null
}

/** Projects where the client declared payment and the vendor still needs to confirm. */
export function hasPendingPaymentConfirm(project: VendorProject) {
  return (project.payments || []).some(p => p.status === 'PENDING')
}

export const ARCHIVED_PREFIX = '[archived]'

export function isArchivedProject(project: { status: string; notes?: string | null }) {
  if (project.status === 'CANCELLED') return true
  return (project.notes ?? '').trimStart().startsWith(ARCHIVED_PREFIX)
}

export function isTestProject(project: { slug: string; title: string; notes?: string | null }) {
  return project.slug.includes('-demo') || project.title.toLowerCase().includes('test') || (project.notes ?? '').includes('[test]')
}

export function isTestClient(client: { email: string; name: string | null }) {
  return client.email.endsWith('.demo') || (client.name ?? '').toLowerCase().includes('test')
}

export function isArchivedClient(client: { avatar?: string | null }) {
  return client.avatar === 'archived'
}

export function projectNextAction(status: string, service?: string | null) {
  return getNextAction(status, service)
}

/**
 * Default journey (photography-shaped). Prefer journeyStagesForService(service).
 * Kept for callers that still import SIMPLE_JOURNEY.
 */
export const SIMPLE_JOURNEY = getServiceProfile('PHOTOGRAPHY').stages

export type JourneyKey = ProfileStageKey

export function hasDeliverables(project: { files?: { type?: string | null }[] | null }) {
  return (project.files || []).some((f) => f.type === 'gallery' || f.type === 'recording')
}

export function hasDeliveryApproval(project: { approvals?: unknown[] | null }) {
  return (project.approvals || []).length > 0
}

function prepComplete(project: any, service?: string | null) {
  const fields = getServiceProfile(service).features.prepFields
  const notes = String(project.notes || '').replace(ARCHIVED_PREFIX, '').trim()
  const moodboard = (project.files || []).some((f: any) => f.type === 'moodboard' && f.url)
  const checks: Record<string, boolean> = {
    eventDate: !!project.eventDate,
    location: !!(project.location && String(project.location).trim()),
    moodboard,
    notes: !!notes,
    equipment: !!notes,
    music: !!notes,
  }
  // Prep counts as done when deposit is in and at least one relevant field is set,
  // or when all primary fields (date + location) are filled.
  const deposit = (project.payments || []).some((p: any) => p.type === 'DEPOSIT' && p.status === 'COMPLETED')
  const filled = fields.filter(f => checks[f]).length
  if (fields.includes('eventDate') && fields.includes('location') && checks.eventDate && checks.location) {
    return true
  }
  return deposit && filled > 0
}

export function journeyProgress(
  project: any,
  service?: string | null,
): Record<ProfileStageKey, boolean> {
  const profile = getServiceProfile(service)
  const deposit = (project.payments || []).some((p: any) => p.type === 'DEPOSIT' && p.status === 'COMPLETED')
  const serviceDone = project.status === 'COMPLETED' || !!project.completedAt
  const deliverables = hasDeliverables(project)
  const approved = hasDeliveryApproval(project)

  const progress: Record<ProfileStageKey, boolean> = {
    created: true,
    questionnaire: !!project.questionnaire?.completedAt,
    quote: !!project.proposal?.acceptedAt,
    deposit,
    prep: prepComplete(project, service),
    service: serviceDone,
    editing: profile.features.showEditing ? (deliverables || (serviceDone && deposit)) : true,
    delivery: profile.features.showDelivery ? deliverables : true,
    approved: profile.features.showApproval ? approved : serviceDone,
    archived: isArchivedProject(project),
  }

  // For profiles without gallery/delivery, skip editing + delivery visually via stages filter.
  if (!profile.features.showEditing) progress.editing = true
  if (!profile.features.showDelivery) progress.delivery = true
  if (!profile.features.showApproval && serviceDone) progress.approved = true

  return progress
}

/** Current in-progress stage + immediate next only (never future past-tense). */
export function projectProgressSummary(project: any, service?: string | null) {
  const progress = journeyProgress(project, service)
  const steps = journeyStagesForService(service)
  let currentIndex = steps.findIndex((s) => !progress[s.key])
  if (currentIndex === -1) currentIndex = steps.length - 1

  const completed = steps.slice(0, currentIndex).filter((s) => progress[s.key])
  const allDone = steps.every((s) => progress[s.key])
  const current = allDone ? steps[steps.length - 1] : steps[currentIndex]
  const next = allDone ? null : steps[currentIndex + 1] ?? null

  return {
    progress,
    completedLabels: completed.map((s) => s.doneLabel),
    currentLabel: allDone ? current.doneLabel : current.label,
    nextLabel: next ? next.label : (allDone ? 'All steps complete' : null),
    currentIndex,
    allDone,
    service: getServiceProfile(service).key as ServiceKey,
  }
}
