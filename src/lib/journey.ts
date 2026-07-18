/**
 * Single source of truth for "where is this project and what happens
 * next". Used by both the vendor workspace and (conceptually) the
 * client view, so the two never disagree.
 */

export type NextAction = {
  status: string
  label: string        // human phase name
  nextAction: string   // what must happen next
  responsible: 'Vendor' | 'Client' | 'Nobody'
}

const MAP: Record<string, Omit<NextAction, 'status'>> = {
  LEAD:                    { label: 'New',                    nextAction: 'Send the secure invitation to the client', responsible: 'Vendor' },
  QUESTIONNAIRE_SENT:      { label: 'Questionnaire sent',     nextAction: 'Client completes the questionnaire',       responsible: 'Client' },
  QUESTIONNAIRE_COMPLETED: { label: 'Questionnaire done',     nextAction: 'Prepare and send the proposal',            responsible: 'Vendor' },
  PROPOSAL_SENT:           { label: 'Proposal sent',          nextAction: 'Client reviews and accepts the proposal',  responsible: 'Client' },
  PROPOSAL_ACCEPTED:       { label: 'Proposal accepted',      nextAction: 'Client reviews and signs the contract',    responsible: 'Client' },
  CONTRACT_SENT:           { label: 'Contract sent',          nextAction: 'Client reviews and signs the contract',    responsible: 'Client' },
  CONTRACT_SIGNED:         { label: 'Contract signed',        nextAction: 'Client pays the deposit',                  responsible: 'Client' },
  DEPOSIT_PAID:            { label: 'Deposit paid',           nextAction: 'Deliver the work and update milestones',   responsible: 'Vendor' },
  FULLY_PAID:              { label: 'Fully paid',             nextAction: 'Complete delivery',                        responsible: 'Vendor' },
  COMPLETED:               { label: 'Completed',              nextAction: 'Request a review',                         responsible: 'Vendor' },
  CANCELLED:               { label: 'Cancelled',              nextAction: 'No further action',                        responsible: 'Nobody' },
}

export function getNextAction(status: string): NextAction {
  const m = MAP[status] ?? { label: status, nextAction: '—', responsible: 'Vendor' as const }
  return { status, ...m }
}

export function nextDeadline(milestones: { dueDate: string | Date | null; completedAt: string | Date | null }[]): Date | null {
  const upcoming = milestones
    .filter(m => m.dueDate && !m.completedAt)
    .map(m => new Date(m.dueDate as any))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
  return upcoming[0] ?? null
}
