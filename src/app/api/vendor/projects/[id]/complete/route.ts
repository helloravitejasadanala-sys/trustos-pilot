import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canCompleteForMoney } from '@/lib/money-settlement'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } },
      include: {
        proposal: { select: { price: true, depositAmount: true, deposit: true } },
        paymentStages: {
          select: { id: true, sortOrder: true, requestedAt: true },
          orderBy: { sortOrder: 'asc' },
        },
        payments: {
          where: { status: 'COMPLETED' },
          select: { status: true, type: true, amount: true, stageId: true },
        },
      },
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (project.status === 'COMPLETED') {
      return NextResponse.json({ ok: true, alreadyCompleted: true })
    }

    const gate = canCompleteForMoney({
      status: project.status,
      stages: project.paymentStages,
      payments: project.payments,
      quoteTotal: Number(project.proposal?.price ?? 0),
      depositAmount: Number(
        project.proposal?.depositAmount ?? project.proposal?.deposit ?? 0,
      ),
    })
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 409 })
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
