import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const { type, method } = await req.json()

    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } },
      include: { proposal: true }
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const amount = type === 'DEPOSIT' 
      ? (project.proposal?.deposit || 0)
      : (project.proposal?.price || 0) - (project.proposal?.deposit || 0)

    await prisma.payment.create({
      data: {
        projectId: project.id,
        type,
        amount,
        status: 'COMPLETED',
        method: method || 'manual',
        paidAt: new Date(),
      }
    })

    const newStatus = type === 'DEPOSIT' ? 'DEPOSIT_PAID' : 'FULLY_PAID'
    await prisma.project.update({
      where: { id: project.id },
      data: { status: newStatus }
    })

    return NextResponse.json({ ok: true, status: newStatus })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
