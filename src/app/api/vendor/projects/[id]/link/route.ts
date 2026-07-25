import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

async function ownedProject(idOrSlug: string, userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } })
  if (!vendor) throw Object.assign(new Error('No vendor'), { status: 404 })
  const project = await prisma.project.findFirst({
    where: { vendorId: vendor.id, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
  })
  if (!project) throw Object.assign(new Error('Not found'), { status: 404 })
  return project
}

/**
 * Vendor adds a deliverable link (files, download pack, recording, etc.).
 * Stored as a File row so the client sees it on their secure journey.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)
    const b = await req.json().catch(() => ({}))

    const name = String(b?.name ?? '').trim()
    const url = String(b?.url ?? '').trim()
    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 })
    }
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 })
    }

    const type = String(b?.type ?? 'link')
    // A project has exactly one mood-board link — replace rather than
    // accumulate duplicates every time the vendor edits it.
    if (type === 'moodboard') {
      await prisma.file.deleteMany({ where: { projectId: project.id, type: 'moodboard' } })
    }

    const file = await prisma.file.create({
      data: {
        projectId: project.id,
        name: name.slice(0, 200),
        url: url.slice(0, 2000),
        size: 0,
        type,
        uploadedBy: user.id,
      },
    })
    await trackEvent('deliverable_link_added', { projectId: project.id, userId: user.id, metadata: { name } })
    return NextResponse.json({ ok: true, file: { id: file.id, name: file.name, url: file.url } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}
