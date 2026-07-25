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
 * - Fast experience survey (under a minute — venue + role + issues + optional tip)
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
      const role = trim(body.role ?? answers.contributor_role, 40)
      const advice = trim(body.advice ?? answers.advice_for_next_professional, 200)
      const issuesRaw = body.issues ?? answers.issues ?? answers.primary_challenge
      const issues = Array.isArray(issuesRaw)
        ? issuesRaw.map(v => trim(v, 80)).filter(Boolean).slice(0, 3)
        : trim(issuesRaw, 200)
          ? [trim(issuesRaw, 200)]
          : []

      if (!venueName || venueName.length < 2) {
        return NextResponse.json({ error: 'Add a venue name to continue.' }, { status: 400 })
      }
      if (!city || city.length < 2) {
        return NextResponse.json({ error: 'Add the UK town or city.' }, { status: 400 })
      }
      if (!role) {
        return NextResponse.json({ error: 'Pick your role on the day.' }, { status: 400 })
      }
      if (issues.length === 0) {
        return NextResponse.json({ error: 'Pick at least one real issue.' }, { status: 400 })
      }
      if (advice.length < 12) {
        return NextResponse.json(
          { error: 'Add one concrete tip for the next vendor.' },
          { status: 400 },
        )
      }

      answers.form = 'venue_experience'
      answers.survey_version = '2.1.0'
      answers.contributor_role = role
      answers.issues = issues
      answers.primary_challenge = issues[0]
      answers.advice_for_next_professional = advice

      // UK pilot — no Maps / email / country picker on the form.
      address = address || `${venueName}, ${city}`
      country = 'United Kingdom'
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
