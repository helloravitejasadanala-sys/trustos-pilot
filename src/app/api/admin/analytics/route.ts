import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAuth(['ADMIN'])

    const [
      totalUsers,
      totalVendors,
      totalProjects,
      totalRevenue,
      funnelData,
      recentActivities,
      projectsByStatus,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.vendorProfile.count(),
      prisma.project.count(),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.activityLog.groupBy({
        by: ['event'],
        _count: { event: true },
        orderBy: { _count: { event: 'desc' } },
        take: 20,
      }),
      prisma.activityLog.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          project: { select: { title: true, slug: true } },
        },
      }),
      prisma.project.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ])

    const funnelStages = [
      { name: 'Invitation Sent', event: 'invitation_sent' },
      { name: 'Invitation Opened', event: 'invitation_opened' },
      { name: 'Questionnaire Started', event: 'questionnaire_started' },
      { name: 'Questionnaire Completed', event: 'questionnaire_completed' },
      { name: 'Proposal Sent', event: 'proposal_sent' },
      { name: 'Proposal Viewed', event: 'proposal_viewed' },
      { name: 'Proposal Accepted', event: 'proposal_accepted' },
      { name: 'Contract Signed', event: 'contract_signed' },
      { name: 'Deposit Paid', event: 'deposit_paid' },
      { name: 'Fully Paid', event: 'fully_paid' },
    ]

    const funnelCounts = Object.fromEntries(
      funnelData.map((f: any) => [f.event, f._count.event])
    )

    return NextResponse.json({
      kpi: {
        totalUsers,
        totalVendors,
        totalProjects,
        totalRevenue: Number(totalRevenue._sum.amount || 0),
      },
      funnel: funnelStages.map(s => ({
        ...s,
        count: funnelCounts[s.event] || 0,
      })),
      recentActivities,
      projectsByStatus: Object.fromEntries(projectsByStatus.map((p: any) => [p.status, p._count.status])),
    })
  } catch (error: any) {
    console.error('[ADMIN ANALYTICS ERROR]', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}
