import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { PilotFeedbackStatus } from '@prisma/client'

const STATUSES: PilotFeedbackStatus[] = ['UNREAD', 'IN_REVIEW', 'RESOLVED', 'ARCHIVED']

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAuth(['ADMIN'])

    const body = await req.json().catch(() => ({}))
    if (!body.status || !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const feedback = await prisma.pilotFeedback.update({
      where: { id: params.id },
      data: { status: body.status as PilotFeedbackStatus },
      include: {
        workspace: { select: { id: true, businessName: true, slug: true } },
      },
    })

    return NextResponse.json({ feedback })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 },
    )
  }
}
