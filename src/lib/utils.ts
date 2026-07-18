import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null): string {
  if (amount == null) return '£0.00'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(num)
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    LEAD: 'bg-ink-100 text-ink-700',
    QUESTIONNAIRE_SENT: 'bg-sand-100 text-sand-700',
    QUESTIONNAIRE_COMPLETED: 'bg-sage-100 text-sage-700',
    PROPOSAL_SENT: 'bg-clay-100 text-clay-700',
    PROPOSAL_ACCEPTED: 'bg-sage-100 text-sage-700',
    CONTRACT_SENT: 'bg-sand-100 text-sand-700',
    CONTRACT_SIGNED: 'bg-sage-100 text-sage-700',
    DEPOSIT_PAID: 'bg-sage-100 text-sage-700',
    FULLY_PAID: 'bg-sage-600 text-white',
    COMPLETED: 'bg-ink-900 text-white',
    CANCELLED: 'bg-red-100 text-red-700',
    PENDING: 'bg-sand-100 text-sand-700',
    PROCESSING: 'bg-clay-100 text-clay-700',
    COMPLETED_PAYMENT: 'bg-sage-100 text-sage-700',
    FAILED: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-sand-100 text-sand-700'
}

export function getStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
