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
 * Delivery approval uses Approval rows; service completion uses project status.
 */
export const SIMPLE_JOURNEY = [
  { key: 'created', label: 'Project created' },
  { key: 'questionnaire', label: 'Details confirmed' },
  { key: 'quote', label: 'Quote accepted' },
  { key: 'deposit', label: 'Deposit received' },
  { key: 'service', label: 'Service completed' },
  { key: 'delivery', label: 'Deliverables sent' },
  { key: 'approved', label: 'Client approved' },
  { key: 'archived', label: 'Archived' },
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
    created: true,
    questionnaire: !!project.questionnaire?.completedAt,
    quote: !!project.proposal?.acceptedAt,
    deposit,
    // Service completed = vendor marked the work done (status / completedAt).
    service: project.status === 'COMPLETED' || !!project.completedAt,
    // Deliverables sent = at least one delivery file link (type gallery).
    delivery: hasDeliverables(project),
    // Client approved = Approval row from the secure client page.
    approved: hasDeliveryApproval(project),
    archived: isArchivedProject(project),
  }
}

/** Completed step, current step, and next incomplete step for progress UI. */
export function projectProgressSummary(project: any) {
  const progress = journeyProgress(project)
  const steps = SIMPLE_JOURNEY.filter((s) => s.key !== 'archived')
  let currentIndex = steps.findIndex((s) => !progress[s.key])
  if (currentIndex === -1) currentIndex = steps.length - 1

  const completed = steps.slice(0, currentIndex).filter((s) => progress[s.key])
  // If everything before archived is done, current is the last completed step.
  const allDone = steps.every((s) => progress[s.key])
  const current = allDone ? steps[steps.length - 1] : steps[currentIndex]
  const next = allDone ? null : steps.slice(currentIndex + 1).find((s) => !progress[s.key]) ?? null

  return {
    progress,
    completedLabels: completed.map((s) => s.label),
    currentLabel: current.label,
    nextLabel: next?.label ?? (allDone ? 'All steps complete' : null),
    allDone,
  }
}
