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

    await prisma.message.create({
      data: {
        projectId: project.id,
        senderId: user.id,
        content: 'Your vendor has requested a review. Please share your experience.',
        type: 'REVIEW_REQUEST'
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
