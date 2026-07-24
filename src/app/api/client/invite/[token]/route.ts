import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateInvitationToken, createClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

/**
 * STAGE 2, step 5 — exchange an invitation token for a scoped session.
 *
 * This is the ONLY route that accepts a token from the URL. Everything
 * afterwards reads the session cookie instead.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const check = await validateInvitationToken(params.token)

    if (!check.ok) {
      return NextResponse.json(
        { error: 'This invitation link is not valid. Please ask your vendor for a new one.' },
        { status: 404 }
      )
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: check.invitationId },
      select: { openedAt: true },
    })

    if (!invitation?.openedAt) {
      await prisma.invitation.update({
        where: { id: check.invitationId },
        data: { openedAt: new Date(), status: 'OPENED' },
      })
      await trackEvent('invitation_opened', {
        projectId: check.projectId,
        metadata: { invitationId: check.invitationId },
      })
    }

    await createClientSession(check.invitationId, check.projectId)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Client invite error:', error)
    return NextResponse.json(
      { error: error.message || 'Could not open invitation. Please try again.' },
      { status: 500 }
    )
  }
}
