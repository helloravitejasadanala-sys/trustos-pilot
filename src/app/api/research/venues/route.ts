import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

function trim(v: unknown, max = 500) {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

/**
 * Public venue research intake.
 * Supports:
 * - Classic admin archive form (name/address/city/country + contributor)
 * - Fast “experience” survey (under a minute — venue + challenge + rating + return)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const source = trim(body.source, 80) || 'public_form'
    const isExperience = source === 'venue_experience' || body.mode === 'experience'

    const venueName = trim(body.venueName ?? body.venue, 200)
    let address = trim(body.address, 400)
    let city = trim(body.city, 120)
    let country = trim(body.country, 120)
    const googleMapsUrl = trim(body.googleMapsUrl, 1000) || null
    let contributorName = trim(body.contributorName, 160)
    let contributorEmail = trim(body.contributorEmail, 200).toLowerCase()
    const workspaceHint = trim(body.workspaceHint, 160) || null

    const answers: Record<string, unknown> =
      body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)
        ? { ...(body.answers as Record<string, unknown>) }
        : {}

    if (isExperience) {
      const challenge = trim(body.challenge ?? answers.primary_challenge, 200)
      const wouldReturn = trim(body.wouldReturn ?? answers.would_work_again, 40)
      const advice = trim(body.advice ?? answers.advice_for_next_professional, 250)
      const ratingRaw = body.rating ?? answers.experience_rating
      const rating = typeof ratingRaw === 'number' ? ratingRaw : Number(ratingRaw)

      if (!venueName || venueName.length < 2) {
        return NextResponse.json({ error: 'Add a venue name to continue.' }, { status: 400 })
      }
      if (!challenge) {
        return NextResponse.json({ error: 'Pick what made the day harder.' }, { status: 400 })
      }
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Choose how the day felt overall.' }, { status: 400 })
      }
      if (!wouldReturn) {
        return NextResponse.json({ error: 'Tell us if you would go back.' }, { status: 400 })
      }

      answers.form = 'venue_experience'
      answers.survey_version = '1.1.0'
      answers.primary_challenge = challenge
      answers.experience_rating = rating
      answers.would_work_again = wouldReturn
      if (advice) answers.advice_for_next_professional = advice

      // DB columns stay required — experience reports fill safe defaults.
      address = address || 'Experience report (no street address)'
      city = city || '—'
      country = country || '—'
      contributorName = contributorName || 'Anonymous contributor'
      contributorEmail =
        contributorEmail || `anon+${randomBytes(8).toString('hex')}@research.trustos.local`
    } else {
      if (!venueName || !address || !city || !country || !contributorName || !contributorEmail) {
        return NextResponse.json(
          { error: 'Venue name, address, city, country, contributor name and email are required.' },
          { status: 400 },
        )
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contributorEmail)) {
        return NextResponse.json({ error: 'Enter a valid contributor email.' }, { status: 400 })
      }
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
      answers.workspaceHint = workspaceHint
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
        source: isExperience ? 'venue_experience' : source,
        workspaceId,
        status: 'PENDING',
        answers: answers as Prisma.InputJsonValue,
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
