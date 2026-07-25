import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { issuePasswordReset } from '@/lib/password-reset'

export const dynamic = 'force-dynamic'

/** Pending forgot-password requests — support re-issues a fresh copyable link. */
export async function GET() {
  try {
    await requireAuth(['ADMIN'])

    const pending = await prisma.passwordResetToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            vendorProfile: { select: { businessName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      resets: pending.map(r => ({
        id: r.id,
        userId: r.userId,
        email: r.user.email,
        name: r.user.vendorProfile?.businessName || r.user.name,
        role: r.user.role,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}

/** Re-issue a fresh reset URL for a pending user (raw token only shown once). */
export async function POST(req: Request) {
  try {
    await requireAuth(['ADMIN'])
    const body = await req.json().catch(() => ({}))
    const userId = String(body.userId || '')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    })
    if (!user || user.role === 'CLIENT') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const issued = await issuePasswordReset(user.id)
    return NextResponse.json({
      ok: true,
      email: user.email,
      resetUrl: issued.url,
      expiresAt: issued.expiresAt.toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}
