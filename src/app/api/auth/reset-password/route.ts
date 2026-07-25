import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { consumePasswordReset } from '@/lib/password-reset'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json().catch(() => ({})))
    const row = await consumePasswordReset(body.token)

    const passwordHash = await bcrypt.hash(body.password, 12)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { password: passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: error.message || 'Could not reset password' },
      { status: error.status || 500 },
    )
  }
}
