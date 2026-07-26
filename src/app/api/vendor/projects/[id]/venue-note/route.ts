import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeCity, normalizeVenueKey } from '@/lib/venue'

export const dynamic = 'force-dynamic'

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t ? t : null
}

function serializeNote(note: {
  id: string
  access: string | null
  power: string | null
  internet: string | null
  lighting: string | null
  restrictions: string | null
  confidence: number | null
  source: string
  createdAt: Date
  projectId: string | null
}) {
  return {
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
}

/** Stage 2: one VenueNote per project — used by Collect UI before showing the form. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } })
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 })
    }

    const project = await prisma.project.findFirst({
      where: { id: params.id, vendorId: vendor.id },
      select: { id: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const note = await prisma.venueNote.findFirst({
      where: { projectId: project.id, vendorId: vendor.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ note: note ? serializeNote(note) : null })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error' },
      { status: err.status || 500 },
    )
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } })
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 })
    }

    // Scope by session vendor only — never trust vendorId from the body.
    const project = await prisma.project.findFirst({
      where: { id: params.id, vendorId: vendor.id },
    })
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const existing = await prisma.venueNote.findFirst({
      where: { projectId: project.id, vendorId: vendor.id },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'A venue note already exists for this booking.' },
        { status: 409 },
      )
    }

    const body = await req.json().catch(() => ({}))

    const locationRaw =
      typeof body.location === 'string' && body.location.trim()
        ? body.location
        : project.location

    const nameKey = normalizeVenueKey(locationRaw)
    if (!nameKey) {
      return NextResponse.json(
        { error: 'Add a venue name on Prep before saving a venue note.' },
        { status: 400 },
      )
    }

    // Same helper as GET lookup — omit/null/whitespace all become "".
    const city = normalizeCity(typeof body.city === 'string' ? body.city : '')

    let confidence: number | null = null
    if (body.confidence !== undefined && body.confidence !== null && body.confidence !== '') {
      const n = typeof body.confidence === 'number' ? body.confidence : parseInt(String(body.confidence), 10)
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        return NextResponse.json(
          { error: 'Confidence must be a whole number from 1 to 5.' },
          { status: 400 },
        )
      }
      confidence = n
    }

    const displayName = String(locationRaw).trim().replace(/\s+/g, ' ')

    const venue = await prisma.vendorVenue.upsert({
      where: {
        vendorId_nameKey_city: {
          vendorId: vendor.id,
          nameKey,
          city,
        },
      },
      create: {
        vendorId: vendor.id,
        name: displayName,
        nameKey,
        city,
      },
      update: {
        name: displayName,
      },
    })

    const note = await prisma.venueNote.create({
      data: {
        venueId: venue.id,
        vendorId: vendor.id,
        projectId: project.id,
        access: optionalText(body.access),
        power: optionalText(body.power),
        internet: optionalText(body.internet),
        lighting: optionalText(body.lighting),
        restrictions: optionalText(body.restrictions),
        confidence,
        source: 'post_event',
      },
    })

    return NextResponse.json({
      ok: true,
      venue: { id: venue.id, name: venue.name, city: venue.city, nameKey: venue.nameKey },
      note: serializeNote(note),
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error' },
      { status: err.status || 500 },
    )
  }
}
