import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

// GET existing answers (project derived from session, never the URL)
export async function GET() {
  try {
    const { projectId } = await requireClientSession()
    const q = await prisma.questionnaire.findUnique({
      where: { projectId },
      select: { answers: true, completedAt: true, startedAt: true },
    })
    return NextResponse.json({ questionnaire: q })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}

// POST answers. `answers` is free-form JSON keyed off the vendor's template.
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession()
    const body = await req.json().catch(() => ({}))
    const answers = body?.answers
    const complete = body?.complete === true

    if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })
    }
    // Bound the payload — a client-supplied JSON blob must not be unbounded.
    if (JSON.stringify(answers).length > 20000) {
      return NextResponse.json({ error: 'Answers too large' }, { status: 413 })
    }

    const q = await prisma.questionnaire.upsert({
      where: { projectId },
      update: {
        answers,
        completedAt: complete ? new Date() : undefined,
      },
      create: {
        projectId,
        answers,
        startedAt: new Date(),
        completedAt: complete ? new Date() : null,
      },
    })

    if (complete) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'QUESTIONNAIRE_COMPLETED' },
      })
      await trackEvent('questionnaire_completed', { projectId })
    } else {
      await trackEvent('questionnaire_started', { projectId })
    }

    return NextResponse.json({ ok: true, completed: !!q.completedAt })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}
