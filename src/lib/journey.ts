/**
 * Single source of truth for "where is this project and what happens
 * next". Used by both the vendor workspace and (conceptually) the
 * client view, so the two never disagree.
 *
 * Service Profiles may override labels/CTAs without changing status logic.
 */

import { getServiceProfile } from '@/lib/service-profiles'

export type NextAction = {
  status: string
  label: string        // human phase name
  nextAction: string   // what must happen next
  responsible: 'Vendor' | 'Client' | 'Nobody'
  /** Vendor-facing primary CTA when responsible === 'Vendor' */
  ctaLabel?: string
}

const MAP: Record<string, Omit<NextAction, 'status'>> = {
  LEAD: {
    label: 'New',
    nextAction: 'Share the invitation with the client',
    responsible: 'Vendor',
    ctaLabel: 'Share invitation →',
  },
  QUESTIONNAIRE_SENT: {
    label: 'Invitation shared',
    nextAction: 'Client confirms details',
    responsible: 'Client',
  },
  QUESTIONNAIRE_COMPLETED: {
    label: 'Details done',
    nextAction: 'Review details and send the quote',
    responsible: 'Vendor',
    ctaLabel: 'Review details →',
  },
  PROPOSAL_SENT: {
    label: 'Quote sent',
    nextAction: 'Client accepts the quote',
    responsible: 'Client',
  },
  PROPOSAL_ACCEPTED: {
    label: 'Quote accepted',
    nextAction: 'Agreement should send automatically — resend if needed',
    responsible: 'Vendor',
    ctaLabel: 'Send agreement →',
  },
  CONTRACT_SENT: {
    label: 'Agreement sent',
    nextAction: 'Client signs the agreement',
    responsible: 'Client',
  },
  CONTRACT_SIGNED: {
    label: 'Agreement signed',
    nextAction: 'Client pays the deposit',
    responsible: 'Client',
  },
  DEPOSIT_PAID: {
    label: 'Deposit paid',
    nextAction: 'Deliver the work',
    responsible: 'Vendor',
    ctaLabel: 'Mark service complete →',
  },
  FULLY_PAID: {
    label: 'Fully paid',
    nextAction: 'Finish delivery',
    responsible: 'Vendor',
    ctaLabel: 'Add delivery →',
  },
  COMPLETED: {
    label: 'Completed',
    nextAction: 'Request a review',
    responsible: 'Vendor',
    ctaLabel: 'Request review →',
  },
  CANCELLED: {
    label: 'Cancelled',
    nextAction: 'No further action',
    responsible: 'Nobody',
  },
}

export function getNextAction(status: string, service?: string | null): NextAction {
  const m = MAP[status] ?? { label: status, nextAction: '—', responsible: 'Vendor' as const }
  const base = { status, ...m }
  const override = getServiceProfile(service).actionCopy[status]
  if (!override) {
    // Deposit wording for makeup advance
    if (status === 'CONTRACT_SIGNED') {
      const depositWord = getServiceProfile(service).depositLabel.toLowerCase()
      return {
        ...base,
        nextAction: `Client pays the ${depositWord}`,
      }
    }
    return base
  }
  return {
    ...base,
    ...override,
  }
}

export function isWaitingOnClient(status: string, service?: string | null): boolean {
  return getNextAction(status, service).responsible === 'Client'
}

export function nextDeadline(milestones: { dueDate: string | Date | null; completedAt: string | Date | null }[]): Date | null {
  const upcoming = milestones
    .filter(m => m.dueDate && !m.completedAt)
    .map(m => new Date(m.dueDate as any))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
  return upcoming[0] ?? null
}
