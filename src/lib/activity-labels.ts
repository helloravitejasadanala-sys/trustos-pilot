/**
 * Human-friendly labels for the technical event names stored in
 * ActivityLog (see lib/analytics.ts EVENTS). Anything shown to a vendor
 * should read like a sentence, never a snake_case code.
 */
const LABELS: Record<string, string> = {
  invitation_created: 'Client link generated',
  invitation_reissued: 'Client link regenerated',
  invitation_sent: 'Client link shared',
  invitation_revoked: 'Client invitation revoked',
  invitation_opened: 'Client opened their secure link',
  deliverable_link_added: 'Added a file link',
  payment_requested: 'Payment requested',
  project_receipt_confirmed: 'Client confirmed receipt',
  proposal_viewed: 'Client viewed the quote',
  proposal_accepted: 'Client accepted the quote',
  proposal_sent: 'Quote sent to client',
  proposal_declined: 'Client declined the quote',
  contract_viewed: 'Client viewed the agreement',
  contract_signed: 'Client signed the agreement',
  contract_sent: 'Agreement sent to client',
  questionnaire_started: 'Client started Event Details',
  questionnaire_completed: 'Client completed Event Details',
  client_declared_payment: 'Client reported a payment',
  approval_completed: 'Client approved delivery',
  changes_requested: 'Client requested changes',
  review_submitted: 'Client left a review',
  deposit_paid: 'Deposit received',
  fully_paid: 'Paid in full',
  final_paid: 'Final payment received',
  instalment_paid: 'Instalment received',
  payment_failed: 'A payment failed',
  project_created: 'Project created',
  project_updated: 'Project updated',
  project_completed: 'Project marked complete',
  project_cancelled: 'Project cancelled',
}

export function humanizeActivityEvent(event: string): string {
  if (LABELS[event]) return LABELS[event]
  // Fallback: turn any unmapped snake_case event into a readable sentence
  // fragment rather than ever showing raw code to a vendor.
  return event.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
}
