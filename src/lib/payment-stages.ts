import 'server-only'

import { prisma } from '@/lib/prisma'
import { usesPaymentSchedule } from '@/lib/payment-stage-rules'

/**
 * Server-only payment schedule access.
 * Pure rules live in `@/lib/payment-stage-rules` (safe for client components).
 */

export {
  MAX_PAYMENT_STAGES,
  usesPaymentSchedule,
  defaultPaymentStagesFromProposal,
  validatePaymentStages,
  paymentTypeForStageIndex,
  isStageCollectOpen,
  projectStatusAfterScheduleProgress,
  scheduleFullyPaid,
  type PaymentStageDraft,
  type StageValidationResult,
} from '@/lib/payment-stage-rules'

export async function projectHasPaymentSchedule(projectId: string): Promise<boolean> {
  const n = await prisma.paymentStage.count({ where: { projectId } })
  return usesPaymentSchedule(n)
}
