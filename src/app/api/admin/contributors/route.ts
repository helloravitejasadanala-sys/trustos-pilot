import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAuth(['ADMIN'])

    const venues = await prisma.venueResearch.findMany({
      select: {
        contributorName: true,
        contributorEmail: true,
        status: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: 'desc' },
    })

    type Agg = {
      contributorName: string
      email: string
      totalSubmissions: number
      verifiedCount: number
      lastContribution: Date
    }

    const byEmail = new Map<string, Agg>()

    for (const v of venues) {
      const email = v.contributorEmail.toLowerCase()
      const existing = byEmail.get(email)
      if (!existing) {
        byEmail.set(email, {
          contributorName: v.contributorName,
          email,
          totalSubmissions: 1,
          verifiedCount: v.status === 'VERIFIED' ? 1 : 0,
          lastContribution: v.submittedAt,
        })
      } else {
        existing.totalSubmissions += 1
        if (v.status === 'VERIFIED') existing.verifiedCount += 1
        if (v.submittedAt > existing.lastContribution) {
          existing.lastContribution = v.submittedAt
          existing.contributorName = v.contributorName
        }
      }
    }

    const contributors = Array.from(byEmail.values())
      .map(c => ({
        contributorName: c.contributorName,
        email: c.email,
        totalSubmissions: c.totalSubmissions,
        verifiedPercent:
          c.totalSubmissions === 0
            ? 0
            : Math.round((c.verifiedCount / c.totalSubmissions) * 100),
        lastContribution: c.lastContribution,
        status: c.verifiedCount > 0 ? 'Active' : 'New',
      }))
      .sort((a, b) => b.totalSubmissions - a.totalSubmissions)

    return NextResponse.json({ contributors })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 },
    )
  }
}
