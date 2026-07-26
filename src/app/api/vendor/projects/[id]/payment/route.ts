import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const body = await req.json().catch(() => ({}))
    const { method, free } = body
    const type: 'DEPOSIT' | 'FINAL' = body.type === 'DEPOSIT' ? 'DEPOSIT' : 'FINAL'

    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } },
      include: { proposal: true, _count: { select: { paymentStages: true } } },
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!project.proposal) {
      return NextResponse.json({ error: 'Send a quote first' }, { status: 409 })
    }

    const isFree = free === true || project.paymentMethod === 'free'
    // Schedule path owns confirm/request — legacy DEPOSIT/FINAL would desync the client.
    if (!isFree && (project._count?.paymentStages ?? 0) > 0 && body.requestBalance !== true) {
      return NextResponse.json(
        {
          error:
            'This booking uses a payment schedule. Confirm or request stages from the Money tab.',
        },
        { status: 409 },
      )
    }
    const deposit = Number(project.proposal.depositAmount ?? project.proposal.deposit ?? 0)
    const price = Number(project.proposal.price)

    // Vendor explicitly opens balance collect on the client portal.
    if (body.requestBalance === true) {
      if (isFree || price <= 0) {
        return NextResponse.json({ error: 'No balance to request on this booking.' }, { status: 409 })
      }
      const depositDone = await prisma.payment.findFirst({
        where: { projectId: project.id, type: 'DEPOSIT', status: 'COMPLETED' },
        select: { id: true },
      })
      if (!depositDone) {
        return NextResponse.json(
          { error: 'Confirm the deposit before requesting the balance.' },
          { status: 409 },
        )
      }
      if (deposit >= price || project.status === 'FULLY_PAID') {
        return NextResponse.json({ error: 'No balance remaining on this booking.' }, { status: 409 })
      }
      await prisma.project.update({
        where: { id: project.id },
        data: { balanceRequestedAt: project.balanceRequestedAt ?? new Date() },
      })
      return NextResponse.json({ ok: true, balanceRequested: true })
    }

    // Free collaboration: record a £0 settlement and complete the money stage.
    if (isFree) {
      await prisma.payment.create({
        data: { projectId: project.id, type: 'FINAL', amount: 0, status: 'COMPLETED', method: 'free', paidAt: new Date() },
      })
      await prisma.project.update({ where: { id: project.id }, data: { status: 'FULLY_PAID' } })
      return NextResponse.json({ ok: true, status: 'FULLY_PAID', free: true })
    }

    const amount = type === 'DEPOSIT' ? deposit : Math.max(0, price - deposit)
    const resolvedMethod = method || project.paymentMethod || 'manual'

    // Full deposit (or deposit covering the total) means money is settled.
    const depositCoversTotal = type === 'DEPOSIT' && deposit > 0 && deposit >= price
    const newStatus =
      type === 'FINAL' || depositCoversTotal || price === 0 ? 'FULLY_PAID' : 'DEPOSIT_PAID'

    // Already confirmed this type — do not create a second COMPLETED row.
    const alreadyCompleted = await prisma.payment.findFirst({
      where: { projectId: project.id, type, status: 'COMPLETED' },
      select: { id: true },
    })
    if (alreadyCompleted) {
      if (project.status !== newStatus && project.status !== 'COMPLETED' && project.status !== 'CANCELLED') {
        await prisma.project.update({
          where: { id: project.id },
          data: { status: newStatus },
        })
      }
      return NextResponse.json({
        ok: true,
        alreadyConfirmed: true,
        status: project.status === 'COMPLETED' || project.status === 'CANCELLED' ? project.status : newStatus,
      })
    }

    // If the client already declared a manual payment (PENDING), confirm
    // that same row rather than creating a duplicate — so the breakdown
    // never double-counts and the audit trail stays clean.
    const pending = await prisma.payment.findFirst({
      where: { projectId: project.id, type, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    })
    if (pending) {
      await prisma.payment.update({
        where: { id: pending.id },
        data: { status: 'COMPLETED', method: resolvedMethod, amount, paidAt: new Date() },
      })
    } else {
      await prisma.payment.create({
        data: {
          projectId: project.id,
          type,
          amount,
          status: 'COMPLETED',
          method: resolvedMethod,
          paidAt: new Date(),
        }
      })
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { status: newStatus },
    })

    return NextResponse.json({ ok: true, status: newStatus })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
