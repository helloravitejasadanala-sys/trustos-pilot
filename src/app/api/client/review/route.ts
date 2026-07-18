import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const clamp = (n: any) => Math.max(1, Math.min(5, Math.round(Number(n) || 0)))

export async function GET() {
  try {
    const { projectId } = await requireClientSession()
    const review = await prisma.review.findUnique({ where: { projectId } })
    return NextResponse.json({ review })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}

/**
 * A verified review — only a client with a session on a COMPLETED
 * project may leave one, and only once.
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession()
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'You can review once the project is complete.' }, { status: 409 })
    }

    const existing = await prisma.review.findUnique({ where: { projectId } })
    if (existing) return NextResponse.json({ ok: true, alreadyReviewed: true })

    const b = await req.json().catch(() => ({}))
    await prisma.review.create({
      data: {
        projectId,
        communication: clamp(b.communication),
        professionalism: clamp(b.professionalism),
        delivery: clamp(b.delivery),
        quality: clamp(b.quality),
        overall: clamp(b.overall),
        comment: b.comment ? String(b.comment).slice(0, 2000) : null,
        submittedBy: String(b.submittedBy ?? 'Client').slice(0, 120),
      },
    })
    await trackEvent('review_submitted', { projectId, metadata: { overall: clamp(b.overall) } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}
