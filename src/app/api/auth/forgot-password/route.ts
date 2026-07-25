import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { issuePasswordReset } from '@/lib/password-reset'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().trim().email(),
})

/**
 * Request a password reset. Always returns the same success shape
 * (no account enumeration). Token is stored hashed; support copies
 * the raw link from Admin → Pilot Users until transactional email ships.
 */
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json().catch(() => ({})))
    const email = body.email.toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    })

    if (user && (user.role === 'VENDOR' || user.role === 'ADMIN')) {
      await issuePasswordReset(user.id)
    }

    return NextResponse.json({
      ok: true,
      message:
        'If that email has a workspace, a reset link is ready for support to send you within one business day.',
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Could not process that request' }, { status: 500 })
  }
}
