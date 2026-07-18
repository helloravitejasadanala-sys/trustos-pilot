import { prisma } from './prisma'

export async function trackEvent(
  event: string,
  options: {
    projectId?: string
    userId?: string
    metadata?: Record<string, any>
  } = {}
) {
  try {
    await prisma.activityLog.create({
      data: {
        event,
        projectId: options.projectId,
        userId: options.userId,
        metadata: options.metadata || {},
      },
    })
  } catch (err) {
    console.error('Analytics tracking error:', err)
  }
}

export const EVENTS = {
  // Invitation flow
  INVITATION_SENT: 'invitation_sent',
  INVITATION_OPENED: 'invitation_opened',
  INVITATION_COMPLETED: 'invitation_completed',

  // Questionnaire
  QUESTIONNAIRE_STARTED: 'questionnaire_started',
  QUESTIONNAIRE_COMPLETED: 'questionnaire_completed',

  // Proposal
  PROPOSAL_SENT: 'proposal_sent',
  PROPOSAL_VIEWED: 'proposal_viewed',
  PROPOSAL_ACCEPTED: 'proposal_accepted',
  PROPOSAL_DECLINED: 'proposal_declined',

  // Contract
  CONTRACT_SENT: 'contract_sent',
  CONTRACT_VIEWED: 'contract_viewed',
  CONTRACT_SIGNED: 'contract_signed',

  // Payment
  DEPOSIT_PAID: 'deposit_paid',
  INSTALMENT_PAID: 'instalment_paid',
  FINAL_PAID: 'final_paid',
  FULLY_PAID: 'fully_paid',
  PAYMENT_FAILED: 'payment_failed',

  // Project lifecycle
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_COMPLETED: 'project_completed',
  PROJECT_CANCELLED: 'project_cancelled',

  // User actions
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTERED: 'user_registered',
} as const
