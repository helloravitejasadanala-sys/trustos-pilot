import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Vendor unlocks a later payment stage for the client (manual request).
 * Stage 0 (on booking) does not need this — open after contract sign.
 * Idempotent: re-request keeps the original requestedAt.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; stageId: string } },
) {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } })
    if (!vendor) return NextResponse.json({ error: 'No vendor' }, { status: 404 })

    const project = await prisma.project.findFirst({
      where: { vendorId: vendor.id, OR: [{ id: params.id }, { slug: params.id }] },
      select: { id: true, status: true },
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const stage = await prisma.paymentStage.findFirst({
      where: { id: params.stageId, projectId: project.id },
    })
    if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })

    if (stage.sortOrder === 0) {
      return NextResponse.json({
        ok: true,
        alreadyOpen: true,
        stage: {
          id: stage.id,
          requestedAt: stage.requestedAt,
          sortOrder: stage.sortOrder,
        },
      })
    }

    const completed = await prisma.payment.findFirst({
      where: { projectId: project.id, stageId: stage.id, status: 'COMPLETED' },
      select: { id: true },
    })
    if (completed) {
      return NextResponse.json(
        { error: 'This stage is already paid.' },
        { status: 409 },
      )
    }

    if (project.status === 'FULLY_PAID' || project.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'No payment to request on this booking.' },
        { status: 409 },
      )
    }

    const updated = await prisma.paymentStage.update({
      where: { id: stage.id },
      data: { requestedAt: stage.requestedAt ?? new Date() },
    })

    return NextResponse.json({
      ok: true,
      stage: {
        id: updated.id,
        requestedAt: updated.requestedAt,
        sortOrder: updated.sortOrder,
        name: updated.name,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Something went wrong' },
      { status: err.status ?? 500 },
    )
  }
}
