import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

/**
 * Client confirms receipt of the final deliverables. Only allowed once
 * the vendor has marked the project ready (status COMPLETED requires
 * the vendor's submit first — see vendor complete route).
 */
export async function POST(_req: NextRequest) {
  try {
    const { projectId } = await requireClientSession()
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Client confirmation is recorded as an approval on the project.
    await prisma.approval.create({
      data: { projectId, approvedBy: 'Client (receipt confirmed)' },
    })
    await trackEvent('project_receipt_confirmed', { projectId })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}
