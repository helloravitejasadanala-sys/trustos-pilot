import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { VenueResearchStatus } from '@prisma/client'

const STATUSES: VenueResearchStatus[] = ['PENDING', 'VERIFIED', 'ARCHIVED']

export async function GET(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])

    const status = req.nextUrl.searchParams.get('status')
    const where =
      status && STATUSES.includes(status as VenueResearchStatus)
        ? { status: status as VenueResearchStatus }
        : {}

    const venues = await prisma.venueResearch.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: {
        workspace: { select: { id: true, businessName: true, slug: true } },
      },
    })

    return NextResponse.json({ venues })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 },
    )
  }
}
