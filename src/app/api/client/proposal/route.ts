import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'
import { sendProjectAgreement } from '@/lib/send-agreement'

export const dynamic = 'force-dynamic'

const PROPOSAL_SELECT = {
  title: true,
  description: true,
  price: true,
  items: true,
  depositPercent: true,
  depositAmount: true,
  expiryDate: true,
  acceptedAt: true,
  declinedAt: true,
} as const

export async function GET(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession(req)
    const proposal = await prisma.proposal.findUnique({
      where: { projectId },
      select: PROPOSAL_SELECT,
    })
    if (proposal) {
      await trackEvent('proposal_viewed', { projectId })
    }

    // Full payment schedule for the quote screen (every stage — no surprises).
    const stages = await prisma.paymentStage.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        amount: true,
        percent: true,
        timingLabel: true,
        sortOrder: true,
      },
    })

    return NextResponse.json({
      proposal: proposal
        ? {
            ...proposal,
            paymentSchedule: stages.map(s => ({
              id: s.id,
              name: s.name,
              amount: Number(s.amount),
              percent: s.percent,
              timingLabel: s.timingLabel,
              sortOrder: s.sortOrder,
            })),
          }
        : null,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unauthorized' },
      { status: err.status ?? 500 },
    )
  }
}

// Accept the proposal. No amount, no id from the browser.
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession(req)
    // Select only fields needed for accept — avoid depending on optional
    // columns (e.g. deposit) that may lag behind schema on some deploys.
    const proposal = await prisma.proposal.findUnique({
      where: { projectId },
      select: { acceptedAt: true, expiryDate: true, price: true },
    })
    if (!proposal) {
      return NextResponse.json({ error: 'No proposal to accept' }, { status: 404 })
    }
    if (proposal.acceptedAt) {
      // Recover if accept landed but agreement auto-send failed earlier.
      await sendProjectAgreement(projectId)
      return NextResponse.json({ ok: true, alreadyAccepted: true })
    }
    if (proposal.expiryDate && proposal.expiryDate.getTime() < Date.now()) {
      return NextResponse.json({ error: 'This proposal has expired' }, { status: 409 })
    }

    // Schedule path: client must have a full plan on the quote before accept.
    const stageCount = await prisma.paymentStage.count({ where: { projectId } })
    if (stageCount > 0) {
      const stages = await prisma.paymentStage.findMany({
        where: { projectId },
        select: { amount: true },
      })
      const sum = stages.reduce((s, st) => s + Number(st.amount), 0)
      const total = Number(proposal.price)
      if (Math.abs(sum - total) > 0.005) {
        return NextResponse.json(
          {
            error:
              'The payment schedule does not match this quote yet. Ask your vendor to update it before you accept.',
          },
          { status: 409 },
        )
      }
    }

    await prisma.proposal.update({
      where: { projectId },
      data: { acceptedAt: new Date() },
    })
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'PROPOSAL_ACCEPTED' },
    })
    await trackEvent('proposal_accepted', { projectId })

    // Auto-send agreement so the client can sign immediately (no vendor click).
    const agreement = await sendProjectAgreement(projectId)
    if (!agreement.ok) {
      console.error('[client/proposal POST] auto agreement failed', agreement.error)
    }

    return NextResponse.json({
      ok: true,
      agreementSent: agreement.ok,
    })
  } catch (err: any) {
    console.error('[client/proposal POST]', err)
    return NextResponse.json(
      { error: err.message || 'Could not accept the proposal' },
      { status: err.status ?? 500 },
    )
  }
}
