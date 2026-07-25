import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { PilotFeedbackStatus } from '@prisma/client'

const STATUSES: PilotFeedbackStatus[] = ['UNREAD', 'IN_REVIEW', 'RESOLVED', 'ARCHIVED']

export async function GET(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])

    const status = req.nextUrl.searchParams.get('status')
    const where =
      status && STATUSES.includes(status as PilotFeedbackStatus)
        ? { status: status as PilotFeedbackStatus }
        : {}

    const feedback = await prisma.pilotFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        workspace: { select: { id: true, businessName: true, slug: true } },
      },
    })

    return NextResponse.json({ feedback })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 },
    )
  }
}
