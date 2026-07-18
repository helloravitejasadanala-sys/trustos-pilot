import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Full workspace read, scoped to the owning vendor. The [id] here is
 * the project SLUG (matches the /vendor/projects/[slug] page). Ownership
 * is verified against the session — a vendor cannot open another
 * vendor's project by guessing a slug.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } })
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 })
    }

    const project = await prisma.project.findFirst({
      where: { slug: params.id, vendorId: vendor.id },
      include: {
        client: { select: { name: true, email: true } },
        questionnaire: true,
        proposal: true,
        contract: {
          select: { content: true, version: true, signedAt: true, signedBy: true, signedIp: true, contentHash: true },
        },
        payments: { orderBy: { createdAt: 'desc' } },
        milestones: { orderBy: { order: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { name: true } } } },
        files: { orderBy: { createdAt: 'desc' } },
        approvals: { orderBy: { createdAt: 'desc' } },
        revisionRequests: { orderBy: { createdAt: 'desc' } },
        review: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        invitations: {
          where: { revokedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { token: true, expiresAt: true, openedAt: true, email: true },
        },
      },
    })

    if (!project) {
      // 404 (not 403) so a vendor cannot probe another vendor's slugs.
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const inv = project.invitations[0]
    const appUrl = (process.env.APP_URL || '').replace(/\/$/, '')
    const { invitations, ...rest } = project

    return NextResponse.json({
      project: {
        ...rest,
        invitation: inv
          ? { url: `${appUrl}/p/${inv.token}`, expiresAt: inv.expiresAt, openedAt: inv.openedAt, email: inv.email }
          : null,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: err.status || 500 })
  }
}
