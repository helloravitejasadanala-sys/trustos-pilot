import 'server-only'

import { prisma } from '@/lib/prisma'
import { defaultPaymentStagesFromProposal } from '@/lib/payment-stage-rules'

/**
 * Replace the booking's payment stages with the default deposit + balance plan.
 * No-op when any COMPLETED payment exists (amounts locked).
 */
export async function applyDefaultPaymentStages(projectId: string): Promise<{
  applied: boolean
  stageCount: number
}> {
  const completed = await prisma.payment.findFirst({
    where: { projectId, status: 'COMPLETED' },
    select: { id: true },
  })
  if (completed) {
    const n = await prisma.paymentStage.count({ where: { projectId } })
    return { applied: false, stageCount: n }
  }

  const proposal = await prisma.proposal.findUnique({ where: { projectId } })
  if (!proposal) return { applied: false, stageCount: 0 }

  const drafts = defaultPaymentStagesFromProposal(proposal)

  const created = await prisma.$transaction(async tx => {
    await tx.payment.deleteMany({
      where: {
        projectId,
        status: 'PENDING',
        stageId: { not: null },
      },
    })
    await tx.paymentStage.deleteMany({ where: { projectId } })
    await tx.paymentStage.createMany({
      data: drafts.map(s => ({
        projectId,
        name: s.name,
        amount: s.amount,
        percent: s.percent,
        timingLabel: s.timingLabel,
        sortOrder: s.sortOrder,
      })),
    })
    return tx.paymentStage.count({ where: { projectId } })
  })

  return { applied: true, stageCount: created }
}
