import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { clearTyping, getPeerTyping, setTyping } from '@/lib/typing'

export const dynamic = 'force-dynamic'

async function ownedProject(idOrSlug: string, userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } })
  if (!vendor) throw Object.assign(new Error('No vendor'), { status: 404 })
  const project = await prisma.project.findFirst({
    where: { vendorId: vendor.id, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true },
  })
  if (!project) throw Object.assign(new Error('Not found'), { status: 404 })
  return { project, vendor }
}

/** Heartbeat while the vendor is composing a message. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const { project } = await ownedProject(params.id, user.id)
    const body = await req.json().catch(() => ({}))
    const active = body.active !== false && String(body.draft || '').trim().length > 0

    if (active) setTyping(project.id, 'vendor', user.name || 'Vendor')
    else clearTyping(project.id, 'vendor')

    return NextResponse.json({
      ok: true,
      peerTyping: getPeerTyping(project.id, 'vendor'),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: e.status || 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const { project } = await ownedProject(params.id, user.id)
    return NextResponse.json({ peerTyping: getPeerTyping(project.id, 'vendor') })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: e.status || 500 })
  }
}
