import { prisma } from '@/lib/prisma'
import { depositFor } from '@/lib/payments'

/**
 * Payment schedule helpers (v1).
 *
 * Dual-path: projects with ≥1 PaymentStage use the schedule; everyone else
 * stays on legacy DEPOSIT / balanceRequestedAt / FINAL. This file is pure
 * rules + reads — no API or UI.
 */

export const MAX_PAYMENT_STAGES = 4
const SUM_EPS = 0.005
const NAME_MAX = 80
const TIMING_MAX = 80

export type PaymentStageDraft = {
  name: string
  amount: number
  percent: number | null
  timingLabel: string
  sortOrder: number
}

export type StageValidationResult =
  | { ok: true; stages: PaymentStageDraft[] }
  | { ok: false; error: string }

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function money(n: number) {
  return `£${round2(n).toFixed(2)}`
}

/** True when this booking should use schedule declare/confirm (not legacy). */
export function usesPaymentSchedule(stageCount: number): boolean {
  return stageCount > 0
}

export async function projectHasPaymentSchedule(projectId: string): Promise<boolean> {
  const n = await prisma.paymentStage.count({ where: { projectId } })
  return usesPaymentSchedule(n)
}

/**
 * Default 2-stage template from the quote.
 * On booking = deposit; Before the event = remainder.
 * Does not auto-balance cleverly — amounts come straight from depositFor + price.
 */
export function defaultPaymentStagesFromProposal(proposal: {
  price: unknown
  depositPercent: number | null
  depositAmount: unknown
}): PaymentStageDraft[] {
  const total = round2(Number(proposal.price) || 0)

  if (total <= 0) {
    return [
      {
        name: 'No payment',
        amount: 0,
        percent: 100,
        timingLabel: 'On booking',
        sortOrder: 0,
      },
    ]
  }

  const deposit = round2(Math.min(depositFor(proposal as any), total))
  const remainder = round2(Math.max(0, total - deposit))

  if (remainder <= SUM_EPS) {
    return [
      {
        name: 'On booking',
        amount: total,
        percent: 100,
        timingLabel: 'On booking',
        sortOrder: 0,
      },
    ]
  }

  if (deposit <= SUM_EPS) {
    return [
      {
        name: 'Full payment',
        amount: total,
        percent: 100,
        timingLabel: 'On booking',
        sortOrder: 0,
      },
    ]
  }

  return [
    {
      name: 'On booking',
      amount: deposit,
      percent: Math.round((deposit / total) * 100),
      timingLabel: 'On booking',
      sortOrder: 0,
    },
    {
      name: 'Before the event',
      amount: remainder,
      percent: Math.round((remainder / total) * 100),
      timingLabel: 'Before the event',
      sortOrder: 1,
    },
  ]
}

/**
 * Validate a stage list for save.
 * - 1..MAX_PAYMENT_STAGES
 * - Sum must equal quote total (reject with difference — never auto-adjust)
 */
export function validatePaymentStages(
  input: unknown,
  quoteTotal: number,
): StageValidationResult {
  if (!Array.isArray(input)) {
    return { ok: false, error: 'Payment stages must be a list.' }
  }
  if (input.length === 0) {
    return { ok: false, error: 'Add at least one payment stage.' }
  }
  if (input.length > MAX_PAYMENT_STAGES) {
    return {
      ok: false,
      error: `At most ${MAX_PAYMENT_STAGES} payment stages (on booking, before event, on the day, after delivery).`,
    }
  }

  const expected = round2(Number(quoteTotal) || 0)
  const seenOrder = new Set<number>()
  const stages: PaymentStageDraft[] = []

  for (let i = 0; i < input.length; i++) {
    const raw = input[i] as Record<string, unknown>
    const name = String(raw?.name ?? '').trim()
    const timingLabel = String(raw?.timingLabel ?? raw?.timing_label ?? '').trim()
    const amount = round2(Number(raw?.amount))
    const sortOrder =
      raw?.sortOrder != null && Number.isFinite(Number(raw.sortOrder))
        ? Math.trunc(Number(raw.sortOrder))
        : i

    if (!name) {
      return { ok: false, error: `Stage ${i + 1}: enter a name.` }
    }
    if (name.length > NAME_MAX) {
      return { ok: false, error: `Stage ${i + 1}: name is too long (max ${NAME_MAX}).` }
    }
    if (!timingLabel) {
      return { ok: false, error: `Stage ${i + 1}: enter rough timing (e.g. On booking).` }
    }
    if (timingLabel.length > TIMING_MAX) {
      return { ok: false, error: `Stage ${i + 1}: timing label is too long (max ${TIMING_MAX}).` }
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return { ok: false, error: `Stage ${i + 1}: enter a valid amount.` }
    }
    if (sortOrder < 0 || sortOrder >= MAX_PAYMENT_STAGES) {
      return { ok: false, error: `Stage ${i + 1}: invalid order.` }
    }
    if (seenOrder.has(sortOrder)) {
      return { ok: false, error: 'Each stage needs a unique order.' }
    }
    seenOrder.add(sortOrder)

    let percent: number | null = null
    if (raw?.percent != null && raw.percent !== '') {
      const p = Number(raw.percent)
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        return { ok: false, error: `Stage ${i + 1}: percent must be between 0 and 100.` }
      }
      percent = Math.round(p)
    }

    stages.push({ name, amount, percent, timingLabel, sortOrder })
  }

  stages.sort((a, b) => a.sortOrder - b.sortOrder)

  const sum = round2(stages.reduce((s, st) => s + st.amount, 0))
  const diff = round2(sum - expected)

  if (Math.abs(diff) > SUM_EPS) {
    const direction = diff > 0 ? 'over' : 'under'
    return {
      ok: false,
      error:
        `Stage amounts must equal the quote total (${money(expected)}). ` +
        `Currently ${money(sum)} — ${direction} by ${money(Math.abs(diff))}. ` +
        `Adjust a stage yourself; nothing is changed automatically.`,
    }
  }

  // Free / £0 quote: allow a single £0 stage.
  if (expected <= SUM_EPS && stages.some(s => s.amount > SUM_EPS)) {
    return {
      ok: false,
      error: `This quote is ${money(0)}. Stage amounts must be ${money(0)}.`,
    }
  }

  return { ok: true, stages }
}

/** Payment.type for a stage index within a schedule. */
export function paymentTypeForStageIndex(
  index: number,
  stageCount: number,
): 'DEPOSIT' | 'INSTALMENT' | 'FINAL' {
  if (stageCount <= 1) return index === 0 ? 'DEPOSIT' : 'FINAL'
  if (index <= 0) return 'DEPOSIT'
  if (index >= stageCount - 1) return 'FINAL'
  return 'INSTALMENT'
}

/**
 * Whether the client may declare against this stage (manual unlock model).
 * First stage: open once the contract is signed (same as today's deposit).
 * Later stages: only after vendor sets requestedAt.
 */
export function isStageCollectOpen(stage: {
  sortOrder: number
  requestedAt: Date | string | null | undefined
}, opts: { contractSigned: boolean }): boolean {
  if (!opts.contractSigned) return false
  if (stage.sortOrder === 0) return true
  return !!stage.requestedAt
}

/**
 * Next project status after schedule payments — never rewinds COMPLETED/CANCELLED.
 * Returns null when status should be left alone.
 */
export function projectStatusAfterScheduleProgress(args: {
  completedStageCount: number
  totalStages: number
  currentStatus: string
}): 'DEPOSIT_PAID' | 'FULLY_PAID' | null {
  const { completedStageCount, totalStages, currentStatus } = args
  if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') return null
  if (totalStages <= 0 || completedStageCount <= 0) return null
  if (completedStageCount >= totalStages) return 'FULLY_PAID'
  return 'DEPOSIT_PAID'
}

/** All stages settled (COMPLETED payment linked to each stage). */
export function scheduleFullyPaid(
  stages: { id: string }[],
  completedStageIds: Iterable<string>,
): boolean {
  if (stages.length === 0) return false
  const done = new Set(completedStageIds)
  return stages.every(s => done.has(s.id))
}
