import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { projectId } = await requireClientSession()
    const proposal = await prisma.proposal.findUnique({
      where: { projectId },
      select: {
        title: true, description: true, price: true, items: true,
        depositPercent: true, depositAmount: true,
        expiryDate: true, acceptedAt: true, declinedAt: true,
      },
    })
    await trackEvent('proposal_viewed', { projectId })
    return NextResponse.json({ proposal })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}

// Accept the proposal. No amount, no id from the browser.
export async function POST() {
  try {
    const { projectId } = await requireClientSession()
    const proposal = await prisma.proposal.findUnique({ where: { projectId } })
    if (!proposal) {
      return NextResponse.json({ error: 'No proposal to accept' }, { status: 404 })
    }
    if (proposal.acceptedAt) {
      return NextResponse.json({ ok: true, alreadyAccepted: true })
    }
    if (proposal.expiryDate && proposal.expiryDate.getTime() < Date.now()) {
      return NextResponse.json({ error: 'This proposal has expired' }, { status: 409 })
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

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}
