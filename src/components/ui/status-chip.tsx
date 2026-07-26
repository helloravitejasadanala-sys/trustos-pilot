/**
 * Domain status vocabulary for project journeys.
 * Tone + label together — never colour alone.
 * Uses Phase 1 chip tokens for readable contrast on panel surfaces.
 */
const CHIP: Record<string, { className: string; label: string }> = {
  LEAD: { className: 'chip chip-muted', label: 'New booking' },
  QUESTIONNAIRE_SENT: { className: 'chip chip-amber', label: 'Waiting on details' },
  QUESTIONNAIRE_COMPLETED: { className: 'chip chip-amber', label: 'Details in' },
  PROPOSAL_SENT: { className: 'chip chip-lav', label: 'Quote sent' },
  PROPOSAL_ACCEPTED: { className: 'chip chip-lav', label: 'Quote accepted' },
  CONTRACT_SENT: { className: 'chip chip-lav', label: 'Agreement sent' },
  CONTRACT_SIGNED: { className: 'chip chip-lav', label: 'Agreement signed' },
  DEPOSIT_PAID: { className: 'chip chip-success', label: 'Deposit paid' },
  FULLY_PAID: { className: 'chip chip-success', label: 'Fully paid' },
  COMPLETED: { className: 'chip chip-success', label: 'Completed' },
  CANCELLED: { className: 'chip chip-muted', label: 'Cancelled' },
}

export function StatusChip({ status }: { status: string }) {
  const c = CHIP[status] ?? { className: 'chip chip-muted', label: status }
  return <span className={c.className}>{c.label}</span>
}
