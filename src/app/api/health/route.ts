import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Public response is deliberately opaque: { ok: true }.
 *
 * Detail (env presence, user counts, DB error strings) is only returned
 * when the caller presents HEALTH_TOKEN via the x-health-token header.
 * The previous version leaked configuration state to anonymous callers.
 */
export async function GET(req: NextRequest) {
  let dbOk = false
  let dbError: string | null = null

  try {
    await prisma.$queryRaw`SELECT 1`
    dbOk = true
  } catch (err: any) {
    dbError = err?.message ?? 'unknown error'
  }

  const healthToken = process.env.HEALTH_TOKEN
  const provided = req.headers.get('x-health-token')
  const authorised = Boolean(healthToken && provided && provided === healthToken)

  if (!authorised) {
    // Opaque: never reveal why. Status still reflects reality for uptime checks.
    return NextResponse.json({ ok: dbOk }, { status: dbOk ? 200 : 503 })
  }

  let userCount: number | null = null
  if (dbOk) {
    try {
      userCount = await prisma.user.count()
    } catch {
      userCount = null
    }
  }

  return NextResponse.json(
    {
      ok: dbOk,
      timestamp: new Date().toISOString(),
      node_env: process.env.NODE_ENV,
      database_url_set: !!process.env.DATABASE_URL,
      auth_secret_set: !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
      app_url: process.env.APP_URL ?? null,
      database_connected: dbOk,
      database_error: dbError,
      user_count: userCount,
    },
    { status: dbOk ? 200 : 503 }
  )
}
