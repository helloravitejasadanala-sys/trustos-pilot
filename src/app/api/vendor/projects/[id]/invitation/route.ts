import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvitationToken } from '@/lib/client-session'
import { appUrl } from '@/lib/invitations'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const INVITATION_TTL_DAYS = 30

/**
 * Ownership check. A vendor may only touch invitations on their own
 * projects — the project id in the URL is verified against the session,
 * never trusted.
 */
async function assertOwnedProject(projectId: string, userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } })
  if (!vendor) {
    const e = new Error('Vendor profile not found') as any
    e.status = 404
    throw e
  }
  const project = await prisma.project.findFirst({
    where: { id: projectId, vendorId: vendor.id },
    select: { id: true },
  })
  if (!project) {
    // 404 rather than 403 — do not confirm that another vendor's
    // project id exists.
    const e = new Error('Project not found') as any
    e.status = 404
    throw e
  }
  return vendor
}

/** Re-issue: revokes any existing invitation and mints a fresh token. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await assertOwnedProject(params.id, user.id)

    const body = await req.json().catch(() => ({}))
    const email: string | null = body?.email ?? null

    await prisma.invitation.updateMany({
      where: { projectId: params.id, revokedAt: null },
      data: { revokedAt: new Date(), status: 'EXPIRED' },
    })

    const invitation = await prisma.invitation.create({
      data: {
        vendorId: vendor.id,
        projectId: params.id,
        email,
        token: generateInvitationToken(),
        expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    })

    await trackEvent('invitation_reissued', {
      projectId: params.id,
      userId: user.id,
      metadata: { invitationId: invitation.id },
    })

    return NextResponse.json({
      invitation: {
        url: `${appUrl()}/p/${invitation.token}`,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

/**
 * Vendor explicitly shared (or confirmed sharing) the link.
 * Marks invitation_sent and advances LEAD → QUESTIONNAIRE_SENT so
 * "waiting for client" is honest. Idempotent.
 */
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    await assertOwnedProject(params.id, user.id)

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const invite = await prisma.invitation.findFirst({
      where: { projectId: params.id, revokedAt: null },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!invite) {
      return NextResponse.json({ error: 'No active invitation link' }, { status: 404 })
    }

    if (project.status === 'LEAD') {
      await prisma.project.update({
        where: { id: params.id },
        data: { status: 'QUESTIONNAIRE_SENT' },
      })
    }

    await trackEvent('invitation_sent', {
      projectId: params.id,
      userId: user.id,
      metadata: { invitationId: invite.id },
    })

    return NextResponse.json({ ok: true, status: project.status === 'LEAD' ? 'QUESTIONNAIRE_SENT' : project.status })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 },
    )
  }
}

/** Revoke: kills the link and any live client session using it. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    await assertOwnedProject(params.id, user.id)

    const result = await prisma.invitation.updateMany({
      where: { projectId: params.id, revokedAt: null },
      data: { revokedAt: new Date(), status: 'EXPIRED' },
    })

    await trackEvent('invitation_revoked', {
      projectId: params.id,
      userId: user.id,
      metadata: { count: result.count },
    })

    return NextResponse.json({ revoked: result.count })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}
