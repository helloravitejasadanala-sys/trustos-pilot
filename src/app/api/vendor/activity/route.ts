import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { humanizeActivityEvent } from '@/lib/activity-labels'

export const dynamic = 'force-dynamic'

/**
 * A lightweight, read-only feed for the dashboard's "Recent activity"
 * section — the last few things that happened across every project,
 * so a vendor can see momentum without opening each one.
 */
export async function GET() {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } })
    if (!vendor) return NextResponse.json({ activity: [] })

    const activity = await prisma.activityLog.findMany({
      where: { project: { vendorId: vendor.id } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        event: true,
        createdAt: true,
        project: { select: { title: true, slug: true } },
      },
    })

    return NextResponse.json({
      activity: activity.map(a => ({ ...a, event: humanizeActivityEvent(a.event) })),
    })
  } catch (error: any) {
    return NextResponse.json({ activity: [], error: error.message || 'Error' }, { status: error.status || 500 })
  }
}
