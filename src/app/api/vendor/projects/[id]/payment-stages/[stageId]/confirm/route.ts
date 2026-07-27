import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { trackEvent } from '@/lib/analytics'
import {
  paymentTypeForStageIndex,
  projectStatusAfterScheduleProgress,
} from '@/lib/payment-stages'

export const dynamic = 'force-dynamic'

/**
 * Confirm payment for one schedule stage.
 * Idempotent: one COMPLETED per stageId — second call returns alreadyConfirmed.
 * Vendor scope from session only.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; stageId: string } },
) {
  try {
    const user = await requireAuth(['VENDOR'])
    const body = await req.json().catch(() => ({}))
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } })
    if (!vendor) return NextResponse.json({ error: 'No vendor' }, { status: 404 })

    const project = await prisma.project.findFirst({
      where: { vendorId: vendor.id, OR: [{ id: params.id }, { slug: params.id }] },
      include: { proposal: true },
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // COMPLETED allowed so early-complete bookings can still settle a balance.
    const confirmable = new Set([
      'CONTRACT_SIGNED',
      'DEPOSIT_PAID',
      'FULLY_PAID',
      'COMPLETED',
    ])
    if (!confirmable.has(project.status)) {
      return NextResponse.json(
        {
          error:
            'Confirm payment only after the client has signed the agreement.',
        },
        { status: 409 },
      )
    }

    const stages = await prisma.paymentStage.findMany({
      where: { projectId: project.id },
      orderBy: { sortOrder: 'asc' },
    })
    const stageIndex = stages.findIndex(s => s.id === params.stageId)
    if (stageIndex < 0) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 })
    }
    const stage = stages[stageIndex]
    const amount = Number(stage.amount)
    const type = paymentTypeForStageIndex(stageIndex, stages.length)
    const resolvedMethod =
      typeof body?.method === 'string' && body.method.trim()
        ? String(body.method).trim()
        : project.paymentMethod || 'manual'

    // Already confirmed this stage — never create a second COMPLETED row.
    const alreadyCompleted = await prisma.payment.findFirst({
      where: { projectId: project.id, stageId: stage.id, status: 'COMPLETED' },
      select: { id: true },
    })

    const completedCount = await prisma.payment.count({
      where: {
        projectId: project.id,
        status: 'COMPLETED',
        stageId: { in: stages.map(s => s.id) },
      },
    })
    // If confirming now and not yet counted, include this stage in progress.
    const progressCount = alreadyCompleted ? completedCount : completedCount + 1
    const newStatus = projectStatusAfterScheduleProgress({
      completedStageCount: alreadyCompleted ? completedCount : progressCount,
      totalStages: stages.length,
      currentStatus: project.status,
    })

    if (alreadyCompleted) {
      if (
        newStatus &&
        project.status !== newStatus &&
        project.status !== 'COMPLETED' &&
        project.status !== 'CANCELLED'
      ) {
        await prisma.project.update({
          where: { id: project.id },
          data: { status: newStatus },
        })
      }
      return NextResponse.json({
        ok: true,
        alreadyConfirmed: true,
        stageId: stage.id,
        status:
          project.status === 'COMPLETED' || project.status === 'CANCELLED'
            ? project.status
            : newStatus || project.status,
      })
    }

    const pending = await prisma.payment.findFirst({
      where: { projectId: project.id, stageId: stage.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    })
    if (pending) {
      await prisma.payment.update({
        where: { id: pending.id },
        data: {
          status: 'COMPLETED',
          method: resolvedMethod,
          amount,
          type,
          paidAt: new Date(),
        },
      })
    } else {
      await prisma.payment.create({
        data: {
          projectId: project.id,
          stageId: stage.id,
          type,
          amount,
          status: 'COMPLETED',
          method: resolvedMethod,
          paidAt: new Date(),
        },
      })
    }

    if (newStatus && project.status !== 'COMPLETED' && project.status !== 'CANCELLED') {
      await prisma.project.update({
        where: { id: project.id },
        data: { status: newStatus },
      })
    }

    await trackEvent('payment_confirmed', {
      projectId: project.id,
      userId: user.id,
      metadata: { stageId: stage.id, amount, type, method: resolvedMethod },
    })

    return NextResponse.json({
      ok: true,
      stageId: stage.id,
      status: newStatus || project.status,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Something went wrong' },
      { status: err.status ?? 500 },
    )
  }
}
