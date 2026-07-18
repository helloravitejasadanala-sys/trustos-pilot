'use client'

import { ReactNode } from 'react'

/**
 * Stage 5 — shared UI primitives. Quiet by design: thin borders,
 * restrained radius, one weight of shadow, a single status vocabulary.
 * No logic lives here; these are presentation only.
 */

// ---- Status chips ---------------------------------------------------
// One consistent vocabulary across vendor and client views. Status is
// never conveyed by colour alone — each chip pairs tone with a label.
const CHIP: Record<string, { bg: string; text: string; label: string }> = {
  LEAD:                    { bg: 'bg-ink-100', text: 'text-ink-600', label: 'New' },
  QUESTIONNAIRE_SENT:      { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Questionnaire sent' },
  QUESTIONNAIRE_COMPLETED: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Questionnaire done' },
  PROPOSAL_SENT:           { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Proposal sent' },
  PROPOSAL_ACCEPTED:       { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Proposal accepted' },
  CONTRACT_SENT:           { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Contract sent' },
  CONTRACT_SIGNED:         { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Contract signed' },
  DEPOSIT_PAID:            { bg: 'bg-sage-100', text: 'text-sage-700', label: 'Deposit paid' },
  FULLY_PAID:              { bg: 'bg-sage-100', text: 'text-sage-700', label: 'Fully paid' },
  COMPLETED:               { bg: 'bg-sage-100', text: 'text-sage-800', label: 'Completed' },
  CANCELLED:               { bg: 'bg-ink-100', text: 'text-ink-500', label: 'Cancelled' },
}

export function StatusChip({ status }: { status: string }) {
  const c = CHIP[status] ?? { bg: 'bg-ink-100', text: 'text-ink-600', label: status }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

// ---- Skeleton loaders ----------------------------------------------
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-ink-100 rounded ${className}`} />
}

export function CardSkeleton() {
  return (
    <div className="border border-ink-100 rounded-2xl bg-white p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

// ---- Empty states ---------------------------------------------------
// An empty screen is an invitation to act, not a shrug.
export function EmptyState({
  icon, title, description, action,
}: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      {icon && <div className="mx-auto w-10 h-10 flex items-center justify-center text-ink-300 mb-3">{icon}</div>}
      <p className="text-ink-900 font-medium">{title}</p>
      {description && <p className="text-ink-500 text-sm mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ---- Section card ---------------------------------------------------
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border border-ink-100 rounded-2xl bg-white ${className}`}>{children}</div>
}
