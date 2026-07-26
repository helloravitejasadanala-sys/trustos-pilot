/**
 * Pure payment maths — safe for client and server.
 * No Prisma, no env, no Node-only APIs.
 */

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}

/** Deposit owed from an accepted proposal (never trust the browser for this). */
export function depositFor(proposal: {
  price: unknown
  depositPercent: number | null
  depositAmount: unknown
}): number {
  const price = Number(proposal.price)
  if (proposal.depositAmount != null) return roundMoney(Number(proposal.depositAmount))
  if (proposal.depositPercent != null) return roundMoney(price * (proposal.depositPercent / 100))
  return roundMoney(price * 0.5)
}
