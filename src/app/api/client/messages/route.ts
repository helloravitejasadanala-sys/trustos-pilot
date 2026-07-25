import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { clearTyping, getPeerTyping } from '@/lib/typing'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { projectId } = await requireClientSession()
    const messages = await prisma.message.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { name: true, role: true } } },
    })
    return NextResponse.json({
      messages,
      peerTyping: getPeerTyping(projectId, 'client'),
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized', messages: [] }, { status: err.status ?? 401 })
  }
}

const sendSchema = z.object({ content: z.string().trim().min(1).max(4000) })

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession()
    const { content } = sendSchema.parse(await req.json().catch(() => ({})))

    // The message sender must be the project's client user.
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { clientId: true },
    })
    if (!project?.clientId) {
      return NextResponse.json({ error: 'Messaging is not available yet for this project.' }, { status: 409 })
    }

    const message = await prisma.message.create({
      data: { projectId, senderId: project.clientId, content, type: 'client' },
      include: { sender: { select: { name: true, role: true } } },
    })
    clearTyping(projectId, 'client')
    return NextResponse.json({ message })
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'Type a message first' }, { status: 400 })
    }
    return NextResponse.json({ error: err.message || 'Error' }, { status: err.status ?? 500 })
  }
}
