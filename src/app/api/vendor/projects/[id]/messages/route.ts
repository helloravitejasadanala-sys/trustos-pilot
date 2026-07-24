import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

async function ownedProject(idOrSlug: string, userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } })
  if (!vendor) throw Object.assign(new Error('No vendor'), { status: 404 })
  const project = await prisma.project.findFirst({
    where: { vendorId: vendor.id, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true },
  })
  if (!project) throw Object.assign(new Error('Not found'), { status: 404 })
  return project
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)
    const messages = await prisma.message.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { name: true, role: true } } },
    })
    return NextResponse.json({ messages })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error', messages: [] }, { status: e.status || 500 })
  }
}

const sendSchema = z.object({ content: z.string().trim().min(1).max(4000) })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)
    const { content } = sendSchema.parse(await req.json().catch(() => ({})))

    const message = await prisma.message.create({
      data: { projectId: project.id, senderId: user.id, content, type: 'vendor' },
      include: { sender: { select: { name: true, role: true } } },
    })
    return NextResponse.json({ message })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: 'Type a message first' }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || 'Error' }, { status: e.status || 500 })
  }
}
