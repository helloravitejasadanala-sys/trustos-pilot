import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { VenueResearchStatus } from '@prisma/client'

const STATUSES: VenueResearchStatus[] = ['PENDING', 'VERIFIED', 'ARCHIVED']

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAuth(['ADMIN'])

    const venue = await prisma.venueResearch.findUnique({
      where: { id: params.id },
      include: {
        workspace: { select: { id: true, businessName: true, slug: true } },
      },
    })

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    return NextResponse.json({ venue })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 },
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAuth(['ADMIN'])

    const body = await req.json().catch(() => ({}))
    const data: Record<string, unknown> = {}

    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      data.status = body.status
    }

    // Intelligence fields — admin-only storage; never exposed on vendor APIs
    const intelKeys = [
      'parking', 'power', 'restrictions', 'internet', 'dronePolicy',
      'bestCeremonyArea', 'loadingArea', 'accessibility', 'preferredVendors',
      'previousNotes', 'internalTeamNotes', 'trustScore', 'media',
    ] as const

    for (const key of intelKeys) {
      if (body[key] !== undefined) data[key] = body[key]
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const venue = await prisma.venueResearch.update({
      where: { id: params.id },
      data,
      include: {
        workspace: { select: { id: true, businessName: true, slug: true } },
      },
    })

    return NextResponse.json({ venue })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 },
    )
  }
}
