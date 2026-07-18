import { prisma } from './prisma'

/**
 * STAGE 4 — payment maths, all server-side.
 *
 * The browser never supplies an amount. Every figure here is derived
 * from the accepted proposal. This is the one place deposit/balance is
 * computed, so vendor and client can never disagree.
 */

export type PaymentBreakdown = {
  currency: string
  total: number
  depositDue: number
  depositPaid: number
  balanceDue: number      // total - everything completed
  fullyPaid: boolean
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function depositFor(proposal: {
  price: any
  depositPercent: number | null
  depositAmount: any
}): number {
  const price = Number(proposal.price)
  if (proposal.depositAmount != null) return round2(Number(proposal.depositAmount))
  if (proposal.depositPercent != null) return round2(price * (proposal.depositPercent / 100))
  return round2(price * 0.5)
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

  const paidTotal = round2(completed.reduce((s: number, p: any) => s + Number(p.amount), 0))
  const depositPaid = round2(
    completed.filter((p: any) => p.type === 'DEPOSIT').reduce((s: number, p: any) => s + Number(p.amount), 0)
  )

  return {
    currency: 'GBP',
    total: round2(total),
    depositDue: deposit,
    depositPaid,
    balanceDue: round2(Math.max(0, total - paidTotal)),
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
