import 'server-only'

import { prisma } from './prisma'
import { depositFor, roundMoney } from '@/lib/payment-math'

/**
 * STAGE 4 — payment maths (server).
 * Pure helpers (`depositFor`) live in `@/lib/payment-math`.
 * The browser never supplies an amount — breakdown/amountForType stay here.
 */

export { depositFor } from '@/lib/payment-math'

export type PaymentBreakdown = {
  currency: string
  total: number
  depositDue: number
  depositPaid: number
  balanceDue: number      // total - everything completed
  fullyPaid: boolean
}

export async function breakdown(projectId: string): Promise<PaymentBreakdown | null> {
  const proposal = await prisma.proposal.findUnique({ where: { projectId } })
  if (!proposal) return null

  const total = Number(proposal.price)
  const deposit = depositFor(proposal)

  const completed = await prisma.payment.findMany({
    where: { projectId, status: 'COMPLETED' },
    select: { amount: true, type: true },
  })

  const paidTotal = roundMoney(completed.reduce((s: number, p: any) => s + Number(p.amount), 0))
  const depositPaid = roundMoney(
    completed.filter((p: any) => p.type === 'DEPOSIT').reduce((s: number, p: any) => s + Number(p.amount), 0)
  )

  return {
    currency: 'GBP',
    total: roundMoney(total),
    depositDue: deposit,
    depositPaid,
    balanceDue: roundMoney(Math.max(0, total - paidTotal)),
    fullyPaid: paidTotal >= total - 0.005,
  }
}

/**
 * The amount owed for a given payment type, computed server-side.
 * Throws if the type is not currently payable (e.g. a deposit that is
 * already settled, or a balance of zero).
 */
export async function amountForType(
  projectId: string,
  type: 'DEPOSIT' | 'INSTALMENT' | 'FINAL'
): Promise<number> {
  const b = await breakdown(projectId)
  if (!b) throw Object.assign(new Error('No proposal'), { status: 404 })

  if (type === 'DEPOSIT') {
    if (b.depositPaid > 0) throw Object.assign(new Error('Deposit already paid'), { status: 409 })
    return b.depositDue
  }
  // INSTALMENT and FINAL both settle against the outstanding balance.
  if (b.balanceDue <= 0) throw Object.assign(new Error('Nothing left to pay'), { status: 409 })
  return b.balanceDue
}
