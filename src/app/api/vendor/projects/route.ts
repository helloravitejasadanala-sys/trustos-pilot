import { NextRequest, NextResponse } from 'next/server'
import { generateInvitationToken } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { appUrl, formatInvitationLink } from '@/lib/invitations'
import { ALL_DEMO_PROJECT_SLUGS, isDemoVendorEmail } from '@/lib/demo'
import { getServiceProfile, isServiceKey } from '@/lib/service-profiles'
import { noteClientDirectory, resolveOrCreateClient } from '@/lib/vendor-clients'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const INVITATION_TTL_DAYS = 30

export async function GET() {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
    })
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 })
    }

    // Section C — a real workspace never shows seeded sample projects.
    // Demo projects remain visible only inside the seeded demo workspaces
    // (used by the passwordless /demo door).
    const showDemo = isDemoVendorEmail(user.email)
    // Slim list payload for Today / Projects / shell poll — detail route has the rest.
    const projects = await prisma.project.findMany({
      where: {
        vendorId: vendor.id,
        ...(showDemo ? {} : { slug: { notIn: ALL_DEMO_PROJECT_SLUGS } }),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        service: true,
        type: true,
        eventDate: true,
        location: true,
        notes: true,
        paymentMethod: true,
        balanceRequestedAt: true,
        createdAt: true,
        updatedAt: true,
        client: { select: { id: true, name: true, email: true } },
        proposal: {
          select: { price: true, depositAmount: true, deposit: true },
        },
        payments: {
          select: { id: true, type: true, status: true, amount: true, method: true },
        },
        review: { select: { id: true } },
        approvals: { select: { id: true }, take: 1 },
        // Active invitation for copy-link on cards.
        invitations: {
          where: { revokedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { token: true, expiresAt: true, openedAt: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Latest inbound (client) message per project, so Today can show an
    // unread indicator without a schema change. The vendor's own last-seen
    // time is tracked client-side (per device) and compared against this.
    const projectIds = projects.map((p: any) => p.id)
    const lastClientMsg = projectIds.length
      ? await prisma.message.groupBy({
          by: ['projectId'],
          where: { projectId: { in: projectIds }, type: 'client' },
          _max: { createdAt: true },
        })
      : []
    const lastMsgMap = new Map(lastClientMsg.map((m: any) => [m.projectId, m._max.createdAt]))

    // Do not mint invitations on list GET — that N+1 writes under connection_limit=1.
    // Share / detail / create paths call ensureActiveInvitation when a link is needed.
    const withLinks = projects.map((p: any) => {
      const inv = p.invitations[0] || null
      const { invitations, ...rest } = p
      return {
        ...rest,
        invitation: inv ? formatInvitationLink(inv) : null,
        lastClientMessageAt: lastMsgMap.get(p.id) ?? null,
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
  /** Per-booking service; falls back to workspace primary when omitted. */
  service: z.string().optional(),
  type: z.string(),
  eventDate: z.string().optional(),
  location: z.string().optional(),
  budget: z.number().optional(),
  notes: z.string().optional(),
  clientName: z.string().trim().optional(),
  clientEmail: z.string().trim().email('Client email is required'),
  clientPhone: z.string().trim().optional(),
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

    const bookingService = isServiceKey(data.service) ? data.service : vendor.primaryService
    const profile = getServiceProfile(bookingService)
    if (!profile.allowedProjectTypes.includes(data.type)) {
      return NextResponse.json(
        { error: `That job type is not available for ${profile.label}.` },
        { status: 400 },
      )
    }

    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)

    // Client email is required so chat works on the booking page.
    const clientEmail = data.clientEmail.toLowerCase()
    const resolved = await resolveOrCreateClient({
      vendorId: vendor.id,
      vendorUserId: user.id,
      vendorEmail: user.email,
      name: data.clientName,
      email: clientEmail,
      phone: data.clientPhone,
    })
    const clientId = resolved.client.id
    const clientReused = resolved.reused
    await noteClientDirectory(user.id, clientId, clientEmail, clientReused)

    const project = await prisma.project.create({
      data: {
        vendorId: vendor.id,
        clientId,
        title: data.title,
        slug,
        service: bookingService as any,
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
        email: clientEmail,
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
      clientReused,
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
