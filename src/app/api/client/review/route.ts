import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const clamp = (n: unknown) => Math.max(1, Math.min(5, Math.round(Number(n) || 0)))

function shortText(raw: unknown, max = 280): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  return t ? t.slice(0, max) : null
}

async function canLeaveReview(projectId: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      status: true,
      approvals: { select: { id: true }, take: 1 },
    },
  })
  if (!project) return { ok: false, status: 404, error: 'Not found' }

  const deliveryApproved = project.approvals.length > 0
  const completed = project.status === 'COMPLETED'
  if (!deliveryApproved && !completed) {
    return {
      ok: false,
      status: 409,
      error: 'You can leave a review after you approve delivery, or once the booking is complete.',
    }
  }
  return { ok: true }
}

export async function GET(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession(req)
    const review = await prisma.review.findUnique({ where: { projectId } })
    const gate = await canLeaveReview(projectId)
    return NextResponse.json({
      review,
      canReview: gate.ok,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}

/**
 * One review per project. Gate: delivery approved OR project COMPLETED.
 * Stores on Review only — never writes VenueNote / VendorVenue.
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession(req)
    const gate = await canLeaveReview(projectId)
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const existing = await prisma.review.findUnique({ where: { projectId } })
    if (existing) return NextResponse.json({ ok: true, alreadyReviewed: true, review: existing })

    const b = await req.json().catch(() => ({}))
    const overall = clamp(b.overall)
    if (!b.overall || overall < 1) {
      return NextResponse.json({ error: 'Choose a star rating from 1 to 5.' }, { status: 400 })
    }

    const wentWell = shortText(b.wentWell)
    const wouldRecommend = shortText(b.wouldRecommend)

    const review = await prisma.review.create({
      data: {
        projectId,
        overall,
        // Keep legacy NOT NULL score columns in sync for older readers.
        communication: overall,
        professionalism: overall,
        delivery: overall,
        quality: overall,
        wentWell,
        wouldRecommend,
        comment: shortText(b.comment, 2000),
        submittedBy: String(b.submittedBy ?? 'Client').slice(0, 120),
      },
    })
    await trackEvent('review_submitted', { projectId, metadata: { overall } })
    return NextResponse.json({ ok: true, review })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unauthorized' },
      { status: err.status ?? 500 },
    )
  }
}
