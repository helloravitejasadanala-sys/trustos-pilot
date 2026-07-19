import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } }
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const existing = await prisma.questionnaire.findFirst({
      where: { projectId: project.id }
    })

    if (existing) {
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'QUESTIONNAIRE_SENT' }
      })
    } else {
      await prisma.questionnaire.create({
        data: { projectId: project.id, startedAt: new Date() }
      })
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'QUESTIONNAIRE_SENT' }
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
