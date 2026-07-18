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
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const check = await validateInvitationToken(params.token)

  if (!check.ok) {
    // One message for every failure. Distinguishing "expired" from
    // "not found" would confirm to a stranger which tokens are real.
    return NextResponse.json(
      { error: 'This invitation link is not valid. Please ask your vendor for a new one.' },
      { status: 404 }
    )
  }

  // Record the first open only, so the timestamp means "first viewed".
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
}
