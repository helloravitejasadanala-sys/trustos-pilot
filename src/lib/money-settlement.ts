/**
 * Shared helpers: when is money settled enough to complete, and when should
 * the vendor request a later schedule stage.
 * Client-safe (no Prisma).
 */

export type StageLite = {
  id: string
  sortOrder: number
  requestedAt?: string | Date | null
}

export type PaymentLite = {
  status?: string | null
  type?: string | null
  /** number, string, or Prisma Decimal — callers may pass raw rows. */
  amount?: number | string | { toString(): string } | null
  stageId?: string | null
}

/** Stage ids with a COMPLETED payment. */
export function completedStageIdSet(payments: PaymentLite[] | null | undefined): Set<string> {
  const set = new Set<string>()
  for (const p of payments || []) {
    if (p.status === 'COMPLETED' && p.stageId) set.add(p.stageId)
  }
  return set
}

/** Later stages (sortOrder > 0) that are not yet paid. */
export function unpaidLaterStages(
  stages: StageLite[],
  payments: PaymentLite[] | null | undefined,
): StageLite[] {
  const done = completedStageIdSet(payments)
  return stages.filter(s => s.sortOrder > 0 && !done.has(s.id))
}

/** True when every payment stage has a COMPLETED payment (or there are no stages). */
export function allStagesSettled(
  stages: StageLite[],
  payments: PaymentLite[] | null | undefined,
): boolean {
  if (stages.length === 0) return true
  const done = completedStageIdSet(payments)
  return stages.every(s => done.has(s.id))
}

/**
 * Vendor may mark the booking complete for money reasons.
 * - Schedule: every stage paid (status usually FULLY_PAID).
 * - Legacy: FULLY_PAID, or DEPOSIT_PAID when deposit covers the quote total.
 */
export function canCompleteForMoney(opts: {
  status: string
  stages: StageLite[]
  payments: PaymentLite[] | null | undefined
  quoteTotal: number
  depositAmount: number
}): { ok: true } | { ok: false; error: string } {
  const { status, stages, payments, quoteTotal, depositAmount } = opts

  if (status === 'COMPLETED') return { ok: true }
  if (status === 'CANCELLED') {
    return { ok: false, error: 'This booking is cancelled.' }
  }

  if (stages.length > 0) {
    if (!allStagesSettled(stages, payments)) {
      return {
        ok: false,
        error:
          'Confirm every payment stage (including the balance) before marking this booking complete.',
      }
    }
    if (status === 'FULLY_PAID' || status === 'DEPOSIT_PAID') return { ok: true }
    return {
      ok: false,
      error: 'Mark the booking complete only after payments are fully confirmed.',
    }
  }

  // Legacy deposit / balance
  if (status === 'FULLY_PAID') return { ok: true }
  if (status === 'DEPOSIT_PAID') {
    const price = Number(quoteTotal) || 0
    const deposit = Number(depositAmount) || 0
    if (price > 0 && deposit >= price) return { ok: true }
    return {
      ok: false,
      error:
        'Confirm the balance payment before marking this booking complete, or request it from Money.',
    }
  }

  return {
    ok: false,
    error:
      'Mark the booking complete only after a deposit (or full payment) is confirmed.',
  }
}

/**
 * Deposit is in and a later schedule stage still needs Request from client.
 * Includes COMPLETED bookings so accidental early-complete can be rescued.
 */
export function needsScheduleBalanceRequest(opts: {
  status: string
  paymentMethod?: string | null
  stages: StageLite[]
  payments: PaymentLite[] | null | undefined
}): boolean {
  const { status, paymentMethod, stages, payments } = opts
  if (paymentMethod === 'free') return false
  if (status === 'FULLY_PAID' || status === 'CANCELLED') return false
  if (stages.length === 0) return false

  const done = completedStageIdSet(payments)
  const depositStage = stages.find(s => s.sortOrder === 0)
  const depositDone =
    status === 'DEPOSIT_PAID' ||
    status === 'COMPLETED' ||
    (depositStage ? done.has(depositStage.id) : false) ||
    (payments || []).some(p => p.type === 'DEPOSIT' && p.status === 'COMPLETED')

  if (!depositDone) return false

  return stages.some(
    s => s.sortOrder > 0 && !done.has(s.id) && !s.requestedAt,
  )
}
