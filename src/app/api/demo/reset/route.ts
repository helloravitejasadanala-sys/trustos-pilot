import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEMO, isDemoKey, DEMO_PROJECT_SLUGS } from '@/lib/demo'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

/**
 * "Reset Demo" from /demo. Returns ONE demo project to its seeded
 * starting state so the journey can be run again. Hard-scoped: only the
 * two demo slugs are ever touched, checked against the allowlist before
 * any write. A real project can never be reset here.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const key = String(body?.key ?? '')

  if (!isDemoKey(key)) {
    return NextResponse.json({ error: 'Unknown demo' }, { status: 400 })
  }

  const slug = DEMO[key].projectSlug
  // Guard: never proceed unless the slug is a known demo slug.
  if (!DEMO_PROJECT_SLUGS.includes(slug)) {
    return NextResponse.json({ error: 'Not a demo project' }, { status: 403 })
  }

  const project = await prisma.project.findFirst({
    where: { slug },
    select: { id: true },
  })
  if (!project) {
    return NextResponse.json(
      { error: 'Demo data not found. The database may need seeding.' },
      { status: 404 }
    )
  }
  const projectId = project.id

  // Wipe journey progress, in FK-safe order, then reset the anchors.
  await prisma.$transaction([
    prisma.approval.deleteMany({ where: { projectId } }),
    prisma.revisionRequest.deleteMany({ where: { projectId } }),
    prisma.review.deleteMany({ where: { projectId } }),
    prisma.payment.deleteMany({ where: { projectId } }),
    prisma.questionnaire.deleteMany({ where: { projectId } }),
    // Milestones back to not-started
    prisma.milestone.updateMany({
      where: { projectId },
      data: { status: 'PENDING', completedAt: null, submittedAt: null },
    }),
    // Proposal un-accepted
    prisma.proposal.updateMany({
      where: { projectId },
      data: { acceptedAt: null, declinedAt: null },
    }),
    // Contract un-signed (clear evidence too)
    prisma.contract.updateMany({
      where: { projectId },
      data: {
        signedAt: null, signedBy: null, signedIp: null,
        signedUserAgent: null, contentHash: null,
        acceptanceText: null, clientSessionId: null,
      },
    }),
    // Invitation re-opened
    prisma.invitation.updateMany({
      where: { projectId },
      data: { openedAt: null, revokedAt: null, status: 'PENDING' },
    }),
    // Project back to the starting status
    prisma.project.update({
      where: { id: projectId },
      data: { status: 'PROPOSAL_SENT' },
    }),
  ])

  await trackEvent('demo_reset', { projectId, metadata: { key } })
  return NextResponse.json({ ok: true })
}
