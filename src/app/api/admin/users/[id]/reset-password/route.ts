import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { issuePasswordReset } from '@/lib/password-reset'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  /** Set a new password immediately (support sets it and tells the vendor). */
  password: z.string().min(8).optional(),
  /** Issue a one-time reset link for the vendor to set their own password. */
  issueLink: z.boolean().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(['ADMIN'])
    const body = schema.parse(await req.json().catch(() => ({})))

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.role === 'CLIENT') {
      return NextResponse.json(
        { error: 'Clients use secure project links — they do not have workspace passwords.' },
        { status: 400 },
      )
    }

    if (body.password) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(body.password, 12) },
      })
      return NextResponse.json({
        ok: true,
        mode: 'set',
        email: user.email,
        message: 'Password updated. Share it securely with the vendor.',
      })
    }

    if (body.issueLink !== false) {
      const issued = await issuePasswordReset(user.id)
      return NextResponse.json({
        ok: true,
        mode: 'link',
        email: user.email,
        name: user.name,
        resetUrl: issued.url,
        expiresAt: issued.expiresAt.toISOString(),
      })
    }

    return NextResponse.json({ error: 'Provide password or issueLink' }, { status: 400 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Error' }, { status: error.status || 500 })
  }
}
