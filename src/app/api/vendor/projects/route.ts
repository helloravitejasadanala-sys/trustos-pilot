import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { generateInvitationToken } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { appUrl, ensureActiveInvitation, formatInvitationLink } from '@/lib/invitations'
import { ALL_DEMO_PROJECT_SLUGS, isDemoVendorEmail } from '@/lib/demo'
import { getServiceProfile } from '@/lib/service-profiles'
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
    const projects = await prisma.project.findMany({
      where: {
        vendorId: vendor.id,
        ...(showDemo ? {} : { slug: { notIn: ALL_DEMO_PROJECT_SLUGS } }),
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
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

    const withLinks = await Promise.all(projects.map(async (p: any) => {
      let inv = p.invitations[0]
      if (!inv) {
        inv = await ensureActiveInvitation(vendor.id, p.id, { email: p.client?.email ?? null })
      }
      const { invitations, ...rest } = p
      return {
        ...rest,
        invitation: formatInvitationLink(inv),
        lastClientMessageAt: lastMsgMap.get(p.id) ?? null,
      }
    }))

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
  clientName: z.string().trim().optional(),
  clientEmail: z.string().trim().email().optional().or(z.literal('')),
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

    const profile = getServiceProfile(vendor.primaryService)
    if (!profile.allowedProjectTypes.includes(data.type)) {
      return NextResponse.json(
        { error: `That project type is not available for ${profile.label} workspaces.` },
        { status: 400 },
      )
    }

    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)

    // Create / attach the client up front so the vendor never has to
    // think about "existing vs new client" — it's just a name + email.
    const clientEmail = data.clientEmail ? data.clientEmail.toLowerCase() : null
    let clientId: string | undefined
    if (clientEmail) {
      // Never turn an existing vendor/admin into a client. If the email
      // belongs to another (non-client) account, refuse rather than
      // silently downgrading their role — that corrupted the vendor's own
      // workspace ("Welcome Chaitanya Anil").
      const existingUser = await prisma.user.findUnique({
        where: { email: clientEmail },
        select: { id: true, role: true },
      })
      if (existingUser && existingUser.role !== 'CLIENT') {
        return NextResponse.json(
          { error: 'That email already belongs to another account. Use a different email for the client.' },
          { status: 409 }
        )
      }
      const client = await prisma.user.upsert({
        where: { email: clientEmail },
        update: {
          ...(data.clientName ? { name: data.clientName } : {}),
          ...(data.clientPhone ? { phone: data.clientPhone } : {}),
          role: 'CLIENT',
        },
        create: {
          email: clientEmail,
          name: data.clientName || clientEmail.split('@')[0],
          phone: data.clientPhone || null,
          role: 'CLIENT',
          password: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
        },
        select: { id: true },
      })
      clientId = client.id
    }

    const project = await prisma.project.create({
      data: {
        vendorId: vendor.id,
        clientId,
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
