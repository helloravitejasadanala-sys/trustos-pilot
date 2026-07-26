import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  defaultPaymentStagesFromProposal,
  validatePaymentStages,
} from '@/lib/payment-stages'

export const dynamic = 'force-dynamic'

async function ownedProject(idOrSlug: string, userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } })
  if (!vendor) throw Object.assign(new Error('No vendor'), { status: 404 })
  const project = await prisma.project.findFirst({
    where: { vendorId: vendor.id, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { proposal: true },
  })
  if (!project) throw Object.assign(new Error('Not found'), { status: 404 })
  return project
}

/** Stage amounts lock once any COMPLETED payment exists (same spirit as quote lock). */
async function stagesLocked(projectId: string): Promise<boolean> {
  const row = await prisma.payment.findFirst({
    where: { projectId, status: 'COMPLETED' },
    select: { id: true },
  })
  return !!row
}

function serializeStage(s: {
  id: string
  name: string
  amount: unknown
  percent: number | null
  timingLabel: string
  sortOrder: number
  requestedAt: Date | null
}) {
  return {
    id: s.id,
    name: s.name,
    amount: Number(s.amount),
    percent: s.percent,
    timingLabel: s.timingLabel,
    sortOrder: s.sortOrder,
    requestedAt: s.requestedAt,
  }
}

/** GET — list stages for this vendor-owned booking. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)
    const stages = await prisma.paymentStage.findMany({
      where: { projectId: project.id },
      orderBy: { sortOrder: 'asc' },
    })
    const locked = await stagesLocked(project.id)
    return NextResponse.json({
      stages: stages.map(serializeStage),
      moneyLocked: locked,
      quoteTotal: project.proposal ? Number(project.proposal.price) : null,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Something went wrong' },
      { status: err.status ?? 500 },
    )
  }
}

/**
 * PUT — replace the full schedule (1–4 stages).
 * Body: { stages: [...] } or { applyDefault: true }.
 * Rejected when any COMPLETED payment exists (amounts locked).
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)

    if (!project.proposal) {
      return NextResponse.json({ error: 'Send a quote first' }, { status: 409 })
    }

    if (await stagesLocked(project.id)) {
      return NextResponse.json(
        {
          error:
            "Payment stage amounts are locked because a payment has been confirmed on this booking.",
        },
        { status: 400 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const quoteTotal = Number(project.proposal.price)

    let draftInput: unknown = body?.stages
    if (body?.applyDefault === true) {
      draftInput = defaultPaymentStagesFromProposal(project.proposal)
    }

    const validated = validatePaymentStages(draftInput, quoteTotal)
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const created = await prisma.$transaction(async tx => {
      // Drop pending schedule declares tied to old stages; never touch COMPLETED
      // (lock above already guarantees none exist).
      await tx.payment.deleteMany({
        where: {
          projectId: project.id,
          status: 'PENDING',
          stageId: { not: null },
        },
      })
      await tx.paymentStage.deleteMany({ where: { projectId: project.id } })
      await tx.paymentStage.createMany({
        data: validated.stages.map(s => ({
          projectId: project.id,
          name: s.name,
          amount: s.amount,
          percent: s.percent,
          timingLabel: s.timingLabel,
          sortOrder: s.sortOrder,
        })),
      })
      return tx.paymentStage.findMany({
        where: { projectId: project.id },
        orderBy: { sortOrder: 'asc' },
      })
    })

    return NextResponse.json({
      ok: true,
      stages: created.map(serializeStage),
      moneyLocked: false,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Something went wrong' },
      { status: err.status ?? 500 },
    )
  }
}
