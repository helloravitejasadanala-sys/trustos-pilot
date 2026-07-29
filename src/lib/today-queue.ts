/**
 * Today priority queue — tiered ranking for "Do this first".
 *
 * Tiers (first match wins per project):
 *  1. Someone is blocked waiting on the vendor
 *  2. Time-critical
 *  3. Vendor's move, nobody waiting
 *  4. Optional
 *
 * Within each tier: oldest / longest-wait first — never last-created.
 * £ amount is a tiebreaker only (Tier 1 payments).
 */

import { getNextAction } from '@/lib/journey'
import {
  hasDeliveryApproval,
  hasPendingPaymentConfirm,
  isArchivedProject,
  isEventDateStrictlyBeforeTodayLocal,
  isPrepComplete,
  isVendorClosedProject,
  needsBalanceRequest,
  type VendorProject,
} from '@/lib/vendor-phase1'

export type TodayQueueKind =
  | 'payment'
  | 'unread'
  | 'delivery'
  | 'deadline'
  | 'balance'
  | 'action'
  | 'optional'

export type TodayQueueItem = {
  kind: TodayQueueKind
  tier: 1 | 2 | 3 | 4
  p: VendorProject
  /** Journey next-action when kind is action/optional. */
  na?: ReturnType<typeof getNextAction>
}

export type TodayQueueOptions = {
  /** Which projects have unread client messages (device-local). */
  isUnread: (p: VendorProject) => boolean
  /** Workspace primary service fallback. */
  primaryService?: string
  /** Clock for tests. */
  now?: Date
}

function bookingService(p: VendorProject, workspacePrimary?: string) {
  return p.service || workspacePrimary || 'PHOTOGRAPHY'
}

function ts(value: string | Date | null | undefined): number | null {
  if (!value) return null
  const n = new Date(value).getTime()
  return Number.isFinite(n) ? n : null
}

function createdAtMs(p: VendorProject): number {
  return ts(p.createdAt) ?? 0
}

function pendingPayments(p: VendorProject) {
  return (p.payments || []).filter(x => x.status === 'PENDING')
}

/** Earliest PENDING payment createdAt — when the client first declared. */
export function pendingWaitSinceMs(p: VendorProject): number | null {
  let earliest: number | null = null
  for (const pay of pendingPayments(p)) {
    const t = ts(pay.createdAt)
    if (t == null) continue
    if (earliest == null || t < earliest) earliest = t
  }
  return earliest
}

export function pendingConfirmTotal(p: VendorProject): number {
  return pendingPayments(p).reduce((s, x) => s + Number(x.amount || 0), 0)
}

function deliveryWaitSinceMs(p: VendorProject): number | null {
  const approvals = p.approvals || []
  if (!approvals.length) return null
  let earliest: number | null = null
  for (const a of approvals) {
    const t = ts(a.createdAt)
    if (t == null) continue
    if (earliest == null || t < earliest) earliest = t
  }
  return earliest
}

/** Local calendar: event is tomorrow (not today). */
export function isEventTomorrowLocal(
  eventDate: string | Date | null | undefined,
  now = new Date(),
): boolean {
  if (!eventDate) return false
  const d = new Date(eventDate)
  if (Number.isNaN(d.getTime())) return false
  const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return eventDay.getTime() === tomorrow.getTime()
}

function isLive(p: VendorProject) {
  return !isArchivedProject(p) && !isVendorClosedProject(p)
}

/** Tier 1: delivery approved, vendor still owes a follow-up (no review yet). */
export function needsDeliveryFollowUp(p: VendorProject) {
  return hasDeliveryApproval(p) && !p.review
}

function tier1WaitMs(item: TodayQueueItem, nowMs: number): number {
  if (item.kind === 'payment') {
    const since = pendingWaitSinceMs(item.p)
    return since != null ? nowMs - since : createdAtMs(item.p)
  }
  if (item.kind === 'unread') {
    const since = ts(item.p.lastClientMessageAt)
    return since != null ? nowMs - since : createdAtMs(item.p)
  }
  if (item.kind === 'delivery') {
    const since = deliveryWaitSinceMs(item.p)
    return since != null ? nowMs - since : createdAtMs(item.p)
  }
  return createdAtMs(item.p)
}

function tier1Amount(item: TodayQueueItem): number {
  return item.kind === 'payment' ? pendingConfirmTotal(item.p) : 0
}

function deadlineMs(item: TodayQueueItem): number {
  const t = ts(item.p.eventDate)
  return t ?? Number.MAX_SAFE_INTEGER
}

/**
 * Build the Today action queue. One project appears once (highest tier wins).
 * Empty higher tiers fall through — first item is "Do this first".
 */
export function buildTodayQueue(
  projects: VendorProject[],
  opts: TodayQueueOptions,
): TodayQueueItem[] {
  const now = opts.now ?? new Date()
  const nowMs = now.getTime()
  const live = projects.filter(isLive)
  const seen = new Set<string>()
  const out: TodayQueueItem[] = []

  const push = (item: TodayQueueItem) => {
    if (seen.has(item.p.id)) return
    seen.add(item.p.id)
    out.push(item)
  }

  // ── Tier 1 ──────────────────────────────────────────────────────────
  const tier1: TodayQueueItem[] = []
  for (const p of live) {
    if (hasPendingPaymentConfirm(p)) {
      tier1.push({ kind: 'payment', tier: 1, p })
      continue
    }
    if (opts.isUnread(p)) {
      tier1.push({ kind: 'unread', tier: 1, p })
      continue
    }
    if (needsDeliveryFollowUp(p)) {
      tier1.push({ kind: 'delivery', tier: 1, p })
    }
  }
  tier1.sort((a, b) => {
    const wait = tier1WaitMs(b, nowMs) - tier1WaitMs(a, nowMs)
    if (wait !== 0) return wait
    const amt = tier1Amount(b) - tier1Amount(a)
    if (amt !== 0) return amt
    return createdAtMs(a.p) - createdAtMs(b.p)
  })
  for (const item of tier1) push(item)

  // ── Tier 2 ──────────────────────────────────────────────────────────
  const tier2: TodayQueueItem[] = []
  for (const p of live) {
    if (seen.has(p.id)) continue
    const service = bookingService(p, opts.primaryService)
    const prepIncomplete = !isPrepComplete(p, service)
    if (isEventTomorrowLocal(p.eventDate, now) && prepIncomplete) {
      tier2.push({ kind: 'deadline', tier: 2, p })
      continue
    }
    if (needsBalanceRequest(p) && isEventDateStrictlyBeforeTodayLocal(p.eventDate)) {
      tier2.push({ kind: 'balance', tier: 2, p })
    }
  }
  tier2.sort((a, b) => {
    const d = deadlineMs(a) - deadlineMs(b)
    if (d !== 0) return d
    return createdAtMs(a.p) - createdAtMs(b.p)
  })
  for (const item of tier2) push(item)

  // ── Tier 3 — vendor move, nobody waiting ────────────────────────────
  const tier3: TodayQueueItem[] = []
  for (const p of live) {
    if (seen.has(p.id)) continue
    const service = bookingService(p, opts.primaryService)
    const na = getNextAction(p.status, service)
    if (na.responsible !== 'Vendor') continue
    // Request-review sits in Tier 4 (optional), not the main vendor queue.
    if (p.status === 'COMPLETED' && !p.review) continue
    tier3.push({ kind: 'action', tier: 3, p, na })
  }
  tier3.sort((a, b) => createdAtMs(a.p) - createdAtMs(b.p))
  for (const item of tier3) push(item)

  // ── Tier 4 — optional ───────────────────────────────────────────────
  const tier4: TodayQueueItem[] = []
  for (const p of live) {
    if (seen.has(p.id)) continue
    if (p.status === 'COMPLETED' && !p.review) {
      const na = getNextAction(p.status, bookingService(p, opts.primaryService))
      tier4.push({ kind: 'optional', tier: 4, p, na })
      continue
    }
    // Venue note after the job is underway / past — don't nag brand-new LEADs.
    if (
      !p.hasVenueNote &&
      (isEventDateStrictlyBeforeTodayLocal(p.eventDate) ||
        p.status === 'DEPOSIT_PAID' ||
        p.status === 'FULLY_PAID' ||
        p.status === 'COMPLETED')
    ) {
      tier4.push({ kind: 'optional', tier: 4, p })
    }
  }
  tier4.sort((a, b) => createdAtMs(a.p) - createdAtMs(b.p))
  for (const item of tier4) push(item)

  return out
}
