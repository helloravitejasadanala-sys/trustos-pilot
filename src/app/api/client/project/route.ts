import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'

export const dynamic = 'force-dynamic'

/**
 * STAGE 2, step 7 — the booking summary.
 *
 * Note what this route does NOT do: it takes no slug, no id, no token,
 * no query parameter of any kind. The project comes from the session.
 * Editing the URL cannot reach another project because there is no URL
 * to edit.
 */
export async function GET() {
  try {
    const { projectId } = await requireClientSession()

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        title: true,
        status: true,
        type: true,
        service: true,
        eventDate: true,
        location: true,
        vendor: {
          select: { businessName: true, logo: true, phone: true, location: true, primaryService: true },
        },
        proposal: {
          select: { title: true, description: true, price: true, items: true, acceptedAt: true },
        },
        contract: { select: { signedAt: true } },
        payments: {
          where: { status: 'COMPLETED' },
          select: { amount: true, type: true, paidAt: true },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
          select: { title: true, dueDate: true, completedAt: true },
        },
        files: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, url: true, type: true, createdAt: true },
        },
        // Existence of an approval tells the portal whether the client has
        // already approved delivery (so the button flips to a confirmed state).
        approvals: { select: { id: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
        // Client review on this booking only (never venue knowledge).
        review: {
          select: {
            id: true,
            overall: true,
            wentWell: true,
            wouldRecommend: true,
            createdAt: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.status === 401 ? 'Unauthorized' : 'Something went wrong' },
      { status: err.status ?? 500 }
    )
  }
}
