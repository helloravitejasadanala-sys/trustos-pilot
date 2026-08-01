import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { issuePasswordReset } from '@/lib/password-reset'
import { isResendMailReady, sendResetEmail } from '@/lib/send-reset-email'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().trim().email(),
})

const GENERIC_OK = {
  ok: true as const,
  /**
   * Global delivery mode (not whether this email exists).
   * Safe for the client to branch copy without account enumeration.
   */
  delivery: 'manual' as 'email' | 'manual',
  message:
    'If that email has a workspace, your request is saved for the TrustOS team. No reset email is sent automatically.',
}

/**
 * Request a password reset. Always returns the same success shape
 * (no account enumeration). When Resend is configured, emails the
 * one-time link; otherwise queues a hashed token for Admin → Pilot Users.
 */
export async function GET() {
  const mailEnabled = isResendMailReady()
  return NextResponse.json({
    mailEnabled,
    delivery: mailEnabled ? 'email' : 'manual',
  })
}

export async function POST(req: NextRequest) {
  const mailEnabled = isResendMailReady()
  const base = {
    ...GENERIC_OK,
    delivery: mailEnabled ? ('email' as const) : ('manual' as const),
    message: mailEnabled
      ? 'If that email has a workspace, a reset link is on its way. Check your inbox and spam folder.'
      : GENERIC_OK.message,
  }

  try {
    const body = schema.parse(await req.json().catch(() => ({})))
    const email = body.email.toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, email: true },
    })

    if (user && (user.role === 'VENDOR' || user.role === 'ADMIN')) {
      const issued = await issuePasswordReset(user.id)

      if (mailEnabled) {
        const sent = await sendResetEmail({
          to: user.email,
          resetUrl: issued.url,
          expiresAt: issued.expiresAt,
        })
        if (!sent.ok) {
          // Token remains queued for Admin → Pilot Users.
          console.error('[forgot-password] Resend failed; left manual queue', sent.error)
        }
      }
    }

    return NextResponse.json(base)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Could not process that request' }, { status: 500 })
  }
}
