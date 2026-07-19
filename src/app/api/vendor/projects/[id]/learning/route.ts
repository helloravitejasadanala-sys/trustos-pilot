import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const { answers } = await req.json()

    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } }
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.learning.create({
      data: {
        projectId: project.id,
        vendorId: project.vendorId,
        wentWell: answers.wentWell || '',
        problems: answers.problems || '',
        solution: answers.solution || '',
        missing: answers.missing || '',
        venueAccurate: answers.venueAccurate || '',
        advice: answers.advice || '',
        setupTime: answers.setupTime || '',
        clientJourney: answers.clientJourney || '',
        rating: answers.rating ? parseInt(answers.rating) : null,
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
