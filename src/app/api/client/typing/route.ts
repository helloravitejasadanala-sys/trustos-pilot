import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { clearTyping, getPeerTyping, setTyping } from '@/lib/typing'

export const dynamic = 'force-dynamic'

/** Heartbeat while the client is composing a message. */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession()
    const body = await req.json().catch(() => ({}))
    const active = body.active !== false && String(body.draft || '').trim().length > 0

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { client: { select: { name: true } } },
    })
    const name = project?.client?.name || 'Client'

    if (active) setTyping(projectId, 'client', name)
    else clearTyping(projectId, 'client')

    return NextResponse.json({
      ok: true,
      peerTyping: getPeerTyping(projectId, 'client'),
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 401 })
  }
}

export async function GET() {
  try {
    const { projectId } = await requireClientSession()
    return NextResponse.json({ peerTyping: getPeerTyping(projectId, 'client') })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 401 })
  }
}
