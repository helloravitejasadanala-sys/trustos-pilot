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

export const SIMPLE_JOURNEY = [
  { key: 'created', label: 'Project created' },
  { key: 'questionnaire', label: 'Questionnaire' },
  { key: 'quote', label: 'Quote accepted' },
  { key: 'deposit', label: 'Deposit received' },
  { key: 'shoot', label: 'Shoot completed' },
  { key: 'delivery', label: 'Delivery sent' },
  { key: 'approved', label: 'Client approved' },
  { key: 'archived', label: 'Archived' },
] as const

export function journeyProgress(project: any) {
  const deposit = (project.payments || []).some((p: any) => p.type === 'DEPOSIT' && p.status === 'COMPLETED')
  const hasDelivery = (project.files || []).length > 0
  return {
    created: true,
    questionnaire: !!project.questionnaire?.completedAt,
    quote: !!project.proposal?.acceptedAt,
    deposit,
    shoot: project.status === 'COMPLETED' || !!project.completedAt,
    delivery: hasDelivery || project.status === 'COMPLETED',
    approved: !!project.review,
    archived: isArchivedProject(project),
  }
}
