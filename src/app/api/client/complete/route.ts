import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

/**
 * Client confirms receipt of deliverables.
 *
 * Source of truth:
 * - Deliverables exist as File rows with type "gallery" or "recording"
 * - Approval is recorded as an Approval row (not project status, not Review)
 * - Vendor "service completed" is independent (project.status COMPLETED)
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession(req)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        files: {
          where: { type: { in: ['gallery', 'recording'] } },
          select: { id: true },
        },
        approvals: { select: { id: true }, take: 1 },
      },
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (project.files.length === 0) {
      return NextResponse.json(
        { error: 'Your vendor has not shared deliverables yet.' },
        { status: 400 }
      )
    }

    if (project.approvals.length > 0) {
      return NextResponse.json({ ok: true, alreadyApproved: true })
    }

    await prisma.approval.create({
      data: { projectId, approvedBy: 'Client (receipt confirmed)' },
    })
    await trackEvent('project_receipt_confirmed', { projectId })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}
