import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isStripeConfigured } from '@/lib/stripe-config'

export async function GET() {
  try {
    await requireAuth(['ADMIN'])

    let database: 'ok' | 'error' = 'ok'
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      database = 'error'
    }

    const checks = {
      database,
      authSecret: !!process.env.AUTH_SECRET,
      databaseUrl: !!process.env.DATABASE_URL,
      appUrl: !!process.env.APP_URL || !!process.env.NEXT_PUBLIC_APP_URL || !!process.env.VERCEL_URL,
      stripe: isStripeConfigured(),
    }

    const systemStatus =
      checks.database === 'ok' && checks.authSecret && checks.databaseUrl
        ? 'ok'
        : 'degraded'

    return NextResponse.json({
      systemStatus,
      checkedAt: new Date().toISOString(),
      checks,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 },
    )
  }
}
