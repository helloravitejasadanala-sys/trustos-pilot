import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

/**
 * Client approves a submitted milestone or requests changes.
 * The milestone must belong to the session's project — checked
 * server-side, never trusted from the request.
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession()
    const body = await req.json().catch(() => ({}))
    const { milestoneId, action, detail, by } = body
    const name = String(by ?? 'Client').slice(0, 120)

    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    })
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    if (action === 'approve') {
      await prisma.milestone.update({
        where: { id: milestone.id },
        data: { status: 'APPROVED', completedAt: new Date() },
      })
      await prisma.approval.create({
        data: { projectId, milestoneId: milestone.id, approvedBy: name },
      })
      await trackEvent('approval_completed', { projectId, metadata: { milestoneId } })
      return NextResponse.json({ ok: true })
    }

    if (action === 'request_changes') {
      if (!detail || String(detail).trim().length < 3) {
        return NextResponse.json({ error: 'Please describe the change needed' }, { status: 400 })
      }
      await prisma.milestone.update({
        where: { id: milestone.id },
        data: { status: 'CHANGES_REQUESTED' },
      })
      await prisma.revisionRequest.create({
        data: { projectId, milestoneId: milestone.id, requestedBy: name, detail: String(detail).slice(0, 2000) },
      })
      await trackEvent('changes_requested', { projectId, metadata: { milestoneId } })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}
