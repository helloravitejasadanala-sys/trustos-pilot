import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { clearTyping, getPeerTyping } from '@/lib/typing'
import { resolveOrCreateClient } from '@/lib/vendor-clients'
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

/** Ensure the project has a CLIENT user so messages have a valid senderId. */
async function ensureProjectClientId(projectId: string): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      clientId: true,
      vendorId: true,
      vendor: { select: { userId: true, user: { select: { email: true } } } },
      invitations: {
        where: { revokedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { email: true },
      },
    },
  })
  if (!project) return null
  if (project.clientId) return project.clientId

  const inviteEmail = project.invitations[0]?.email?.trim().toLowerCase()
  if (!inviteEmail) return null

  const resolved = await resolveOrCreateClient({
    vendorId: project.vendorId,
    vendorUserId: project.vendor.userId,
    vendorEmail: project.vendor.user.email,
    name: inviteEmail.split('@')[0],
    email: inviteEmail,
  })
  await prisma.project.update({
    where: { id: project.id },
    data: { clientId: resolved.client.id },
  })
  return resolved.client.id
}

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession()
    const { content } = sendSchema.parse(await req.json().catch(() => ({})))

    const clientId = await ensureProjectClientId(projectId)
    if (!clientId) {
      return NextResponse.json(
        { error: 'Messaging is not available for this booking. Ask your vendor to add your email to the project.' },
        { status: 409 },
      )
    }

    const message = await prisma.message.create({
      data: { projectId, senderId: clientId, content, type: 'client' },
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
