import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function ownedProject(slug: string, userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } })
  if (!vendor) throw Object.assign(new Error('No vendor'), { status: 404 })
  const project = await prisma.project.findFirst({ where: { slug, vendorId: vendor.id } })
  if (!project) throw Object.assign(new Error('Not found'), { status: 404 })
  return project
}

// Replace the milestone set (create from template, reorder, add/remove).
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)
    const b = await req.json()
    const items: any[] = Array.isArray(b.milestones) ? b.milestones : []

    // Only allowed before delivery starts — do not wipe completed work.
    const hasCompleted = await prisma.milestone.count({ where: { projectId: project.id, completedAt: { not: null } } })
    if (hasCompleted > 0) {
      return NextResponse.json({ error: 'Milestones cannot be replaced once work has been marked complete.' }, { status: 409 })
    }

    await prisma.milestone.deleteMany({ where: { projectId: project.id } })
    await prisma.milestone.createMany({
      data: items.map((m, i) => ({
        projectId: project.id,
        title: String(m.title).slice(0, 200),
        description: m.description ?? null,
        owner: m.owner === 'CLIENT' ? 'CLIENT' : 'VENDOR',
        order: i,
        dueDate: m.dueDate ? new Date(m.dueDate) : null,
      })),
    })
    return NextResponse.json({ ok: true, count: items.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}

// Mark one milestone complete.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)
    const b = await req.json()
    const m = await prisma.milestone.findFirst({ where: { id: b.milestoneId, projectId: project.id } })
    if (!m) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    await prisma.milestone.update({
      where: { id: m.id },
      data: { completedAt: new Date(), status: 'APPROVED' },
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
