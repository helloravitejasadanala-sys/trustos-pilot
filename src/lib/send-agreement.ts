import 'server-only'

import { prisma } from '@/lib/prisma'
import { defaultAgreementContent } from '@/lib/agreement-template'
import { getServiceProfile } from '@/lib/service-profiles'

/** Statuses where forcing CONTRACT_SENT would rewind the booking. */
const NO_STATUS_REWIND = new Set([
  'CONTRACT_SIGNED',
  'DEPOSIT_PAID',
  'FULLY_PAID',
  'COMPLETED',
  'CANCELLED',
])

export type SendAgreementResult =
  | { ok: true; alreadySent?: boolean }
  | { ok: false; error: string; status: number }

/**
 * Upsert agreement content and advance to CONTRACT_SENT when still in the
 * post-accept lane. Never rewinds signed / paid / completed bookings.
 */
export async function sendProjectAgreement(projectId: string): Promise<SendAgreementResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      proposal: true,
      client: { select: { name: true } },
      vendor: { select: { businessName: true, primaryService: true } },
      contract: true,
    },
  })
  if (!project) return { ok: false, error: 'Not found', status: 404 }
  if (!project.proposal?.acceptedAt) {
    return {
      ok: false,
      error: 'Client must accept the quote before you send the agreement',
      status: 409,
    }
  }

  // Standing rule: never rewrite content once signed (see agreement-immutability).
  if (project.contract?.signedAt) {
    return { ok: true, alreadySent: true }
  }

  const serviceKey = project.service || project.vendor.primaryService
  const content =
    (project.contract?.content || '').trim() ||
    defaultAgreementContent({
      businessName: project.vendor.businessName,
      clientName: project.client?.name,
      projectTitle: project.title,
      price: Number(project.proposal.price),
      deposit: Number(project.proposal.depositAmount ?? project.proposal.deposit ?? 0),
      eventDate: project.eventDate,
      location: project.location,
      serviceLabel: getServiceProfile(serviceKey).label,
    })

  if (NO_STATUS_REWIND.has(project.status)) {
    if (!project.contract) {
      await prisma.contract.create({
        data: { projectId: project.id, sentAt: new Date(), content },
      })
    }
    return { ok: true, alreadySent: true }
  }

  const hadContent = !!(project.contract?.content || '').trim()
  await prisma.contract.upsert({
    where: { projectId: project.id },
    update: {
      sentAt: new Date(),
      // Only fill content when empty — never overwrite an existing unsigned draft either
      // unless it was cleared on purpose. Signed rows never reach here.
      ...(!hadContent ? { content } : {}),
    },
    create: { projectId: project.id, sentAt: new Date(), content },
  })

  // Only advance from the accept lane (or refresh sentAt while already sent).
  if (project.status === 'PROPOSAL_ACCEPTED') {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'CONTRACT_SENT' },
    })
    return { ok: true }
  }

  if (project.status === 'CONTRACT_SENT') {
    return { ok: true, alreadySent: true }
  }

  // Unexpected pre-accept status slipped through acceptedAt — refuse quietly.
  return {
    ok: false,
    error: 'This booking is not ready for an agreement yet',
    status: 409,
  }
}
