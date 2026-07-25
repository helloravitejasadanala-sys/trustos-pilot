import { getNextAction } from '@/lib/journey'

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

export function projectNextAction(status: string) {
  return getNextAction(status)
}

/**
 * Ordered project journey for the vendor workspace.
 * `label` = in-progress stage name (shown as Now).
 * `doneLabel` = past-tense only for completed steps — never as "Now".
 */
export const SIMPLE_JOURNEY = [
  { key: 'created', label: 'Created', doneLabel: 'Created' },
  { key: 'questionnaire', label: 'Event Details', doneLabel: 'Details confirmed' },
  { key: 'quote', label: 'Quote', doneLabel: 'Quote accepted' },
  { key: 'deposit', label: 'Deposit', doneLabel: 'Deposit received' },
  { key: 'service', label: 'Service', doneLabel: 'Service completed' },
  { key: 'delivery', label: 'Delivery', doneLabel: 'Deliverables sent' },
  { key: 'approved', label: 'Approval', doneLabel: 'Client approved' },
  { key: 'archived', label: 'Archived', doneLabel: 'Archived' },
] as const

export type JourneyKey = (typeof SIMPLE_JOURNEY)[number]['key']

export function hasDeliverables(project: { files?: { type?: string | null }[] | null }) {
  return (project.files || []).some((f) => f.type === 'gallery')
}

export function hasDeliveryApproval(project: { approvals?: unknown[] | null }) {
  return (project.approvals || []).length > 0
}

export function journeyProgress(project: any): Record<JourneyKey, boolean> {
  const deposit = (project.payments || []).some((p: any) => p.type === 'DEPOSIT' && p.status === 'COMPLETED')
  return {
    // Link generated at create; treat as done once the project exists.
    created: true,
    // Event Details only complete after the questionnaire — not when the invite is merely generated.
    questionnaire: !!project.questionnaire?.completedAt,
    quote: !!project.proposal?.acceptedAt,
    deposit,
    service: project.status === 'COMPLETED' || !!project.completedAt,
    delivery: hasDeliverables(project),
    approved: hasDeliveryApproval(project),
    archived: isArchivedProject(project),
  }
}

/** Current in-progress stage + immediate next only (never future past-tense). */
export function projectProgressSummary(project: any) {
  const progress = journeyProgress(project)
  const steps = SIMPLE_JOURNEY.filter((s) => s.key !== 'archived')
  let currentIndex = steps.findIndex((s) => !progress[s.key])
  if (currentIndex === -1) currentIndex = steps.length - 1

  const completed = steps.slice(0, currentIndex).filter((s) => progress[s.key])
  const allDone = steps.every((s) => progress[s.key])
  const current = allDone ? steps[steps.length - 1] : steps[currentIndex]
  // Only the immediate next incomplete stage — not later milestones.
  const next = allDone ? null : steps[currentIndex + 1] ?? null

  return {
    progress,
    completedLabels: completed.map((s) => s.doneLabel),
    currentLabel: allDone ? current.doneLabel : current.label,
    nextLabel: next ? next.label : (allDone ? 'All steps complete' : null),
    currentIndex,
    allDone,
  }
}
