import { NextRequest, NextResponse } from 'next/server'
import { generateInvitationToken } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const INVITATION_TTL_DAYS = 30

/** Absolute base URL used to build invitation links. */
function appUrl() {
  return (process.env.APP_URL || '').replace(/\/$/, '')
}

export async function GET() {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
    })
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 })
    }

    const projects = await prisma.project.findMany({
      where: { vendorId: vendor.id },
      include: {
        client: { select: { name: true, email: true } },
        questionnaire: true,
        proposal: true,
        contract: true,
        payments: true,
        _count: { select: { messages: true, milestones: true } },
        // The active invitation, so the vendor can copy the secure link.
        // Only the owning vendor ever sees a raw token.
        invitations: {
          where: { revokedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { token: true, expiresAt: true, openedAt: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const withLinks = projects.map((p: any) => {
      const inv = p.invitations[0]
      const { invitations, ...rest } = p
      return {
        ...rest,
        invitation: inv
          ? {
              url: `${appUrl()}/p/${inv.token}`,
              expiresAt: inv.expiresAt,
              openedAt: inv.openedAt,
              email: inv.email,
              expired: inv.expiresAt.getTime() <= Date.now(),
            }
          : null,
      }
    })

    return NextResponse.json({ projects: withLinks })
  } catch (error: any) {
    console.error('Vendor projects error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

const createProjectSchema = z.object({
  title: z.string().min(1),
  type: z.string(),
  eventDate: z.string().optional(),
  location: z.string().optional(),
  budget: z.number().optional(),
  notes: z.string().optional(),
  clientEmail: z.string().email().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
    })
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 })
    }

    const body = await req.json()
    const data = createProjectSchema.parse(body)

    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)

    const project = await prisma.project.create({
      data: {
        vendorId: vendor.id,
        title: data.title,
        slug,
        type: data.type as any,
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        location: data.location,
        budget: data.budget,
        notes: data.notes,
        status: 'LEAD',
      },
    })

    // STAGE 2, steps 2-4 — every project gets exactly one secure
    // invitation: unique 256-bit token, linked to this project by FK,
    // expiring in 30 days, revocable, email optional.
    const invitation = await prisma.invitation.create({
      data: {
        vendorId: vendor.id,
        projectId: project.id,
        email: data.clientEmail || null,
        token: generateInvitationToken(),
        expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    })

    await trackEvent('invitation_created', {
      projectId: project.id,
      userId: user.id,
      metadata: { invitationId: invitation.id },
    })

    return NextResponse.json({
      project,
      invitation: {
        // The vendor is the only party who ever sees the raw token.
        url: `${appUrl()}/p/${invitation.token}`,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error: any) {
    console.error('Create project error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}
