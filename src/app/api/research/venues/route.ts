import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function trim(v: unknown, max = 500) {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const venueName = trim(body.venueName, 200)
    const address = trim(body.address, 400)
    const city = trim(body.city, 120)
    const country = trim(body.country, 120)
    const googleMapsUrl = trim(body.googleMapsUrl, 1000) || null
    const contributorName = trim(body.contributorName, 160)
    const contributorEmail = trim(body.contributorEmail, 200).toLowerCase()
    const source = trim(body.source, 80) || 'public_form'
    const workspaceHint = trim(body.workspaceHint, 160) || null

    const answers =
      body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)
        ? body.answers
        : {}

    if (!venueName || !address || !city || !country || !contributorName || !contributorEmail) {
      return NextResponse.json(
        { error: 'Venue name, address, city, country, contributor name and email are required.' },
        { status: 400 },
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contributorEmail)) {
      return NextResponse.json({ error: 'Enter a valid contributor email.' }, { status: 400 })
    }

    let workspaceId: string | null = null
    if (workspaceHint) {
      const workspace = await prisma.vendorProfile.findFirst({
        where: {
          OR: [
            { slug: workspaceHint },
            { businessName: { equals: workspaceHint, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      })
      workspaceId = workspace?.id ?? null
      if (workspaceHint) {
        ;(answers as Record<string, unknown>).workspaceHint = workspaceHint
      }
    }

    const venue = await prisma.venueResearch.create({
      data: {
        venueName,
        address,
        city,
        country,
        googleMapsUrl,
        contributorName,
        contributorEmail,
        source,
        workspaceId,
        status: 'PENDING',
        answers,
      },
      select: { id: true, status: true, submittedAt: true },
    })

    return NextResponse.json({ venue }, { status: 201 })
  } catch (error: any) {
    console.error('[RESEARCH VENUE POST]', error)
    return NextResponse.json(
      { error: error.message || 'Could not save venue research.' },
      { status: error.status || 500 },
    )
  }
}
