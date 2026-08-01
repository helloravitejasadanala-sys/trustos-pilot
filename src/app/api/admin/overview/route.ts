import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAuth(['ADMIN'])

    const [
      totalWorkspaces,
      activePilotVendors,
      totalClients,
      totalProjects,
      totalVenues,
      pendingVenueReviews,
      verifiedVenues,
      feedbackWaiting,
      pendingPasswordResets,
      recentActivities,
      newestVenues,
      newestPilotUsers,
      distinctContributors,
      dbOk,
    ] = await Promise.all([
      prisma.vendorProfile.count(),
      prisma.vendorProfile.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.project.count(),
      prisma.venueResearch.count(),
      prisma.venueResearch.count({ where: { status: 'PENDING' } }),
      prisma.venueResearch.count({ where: { status: 'VERIFIED' } }),
      prisma.pilotFeedback.count({ where: { status: 'UNREAD' } }),
      prisma.passwordResetToken.count({
        where: { usedAt: null, expiresAt: { gt: new Date() } },
      }),
      prisma.activityLog.findMany({
        take: 12,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          project: { select: { title: true, slug: true } },
        },
      }),
      prisma.venueResearch.findMany({
        take: 8,
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          venueName: true,
          city: true,
          country: true,
          contributorName: true,
          status: true,
          submittedAt: true,
        },
      }),
      prisma.user.findMany({
        where: { role: 'VENDOR' },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          vendorProfile: { select: { businessName: true, isActive: true } },
        },
      }),
      prisma.venueResearch.findMany({
        select: { contributorEmail: true },
        distinct: ['contributorEmail'],
      }),
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    ])

    return NextResponse.json({
      cards: {
        totalWorkspaces,
        activePilotVendors,
        totalClients,
        totalProjects,
        totalVenues,
        pendingVenueReviews,
        verifiedVenues,
        totalResearchContributors: distinctContributors.length,
        feedbackWaiting,
        pendingPasswordResets,
        systemStatus: dbOk ? 'ok' : 'degraded',
      },
      recentActivities,
      newestVenues,
      newestPilotUsers,
    })
  } catch (error: any) {
    console.error('[ADMIN OVERVIEW]', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 },
    )
  }
}
