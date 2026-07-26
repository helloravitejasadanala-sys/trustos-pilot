import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeCity, normalizeVenueKey } from '@/lib/venue'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } })
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const nameKey = normalizeVenueKey(searchParams.get('location'))
    if (!nameKey) {
      return NextResponse.json(
        { error: 'Location is required to look up a venue note.' },
        { status: 400 },
      )
    }

    // Same helper as POST — missing query param is null → normalizeCity → "".
    // Callers should pass city= (empty) or omit; never send the string "undefined".
    const city = normalizeCity(searchParams.get('city'))

    // Session vendor only — never accept vendorId/venueId from the query.
    const venue = await prisma.vendorVenue.findUnique({
      where: {
        vendorId_nameKey_city: {
          vendorId: vendor.id,
          nameKey,
          city,
        },
      },
    })

    if (!venue) {
      return NextResponse.json({ match: false })
    }

    const [note, noteCount] = await Promise.all([
      prisma.venueNote.findFirst({
        where: { venueId: venue.id, vendorId: vendor.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.venueNote.count({
        where: { venueId: venue.id, vendorId: vendor.id },
      }),
    ])

    const earlierCount = note && noteCount > 1 ? noteCount - 1 : 0

    return NextResponse.json({
      match: true,
      venue: {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        nameKey: venue.nameKey,
      },
      note: note
        ? {
            id: note.id,
            access: note.access,
            power: note.power,
            internet: note.internet,
            lighting: note.lighting,
            restrictions: note.restrictions,
            confidence: note.confidence,
            source: note.source,
            createdAt: note.createdAt,
            projectId: note.projectId,
          }
        : null,
      earlierCount,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error' },
      { status: err.status || 500 },
    )
  }
}
