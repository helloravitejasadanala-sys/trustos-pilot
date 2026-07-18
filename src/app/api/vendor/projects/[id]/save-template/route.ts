import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Save this project's milestones as a reusable Client Journey Template
 * (stored on the Template model, type PLAYBOOK, content = milestone list).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } })
    if (!vendor) return NextResponse.json({ error: 'No vendor' }, { status: 404 })

    const project = await prisma.project.findFirst({
      where: { slug: params.id, vendorId: vendor.id },
      include: { milestones: { orderBy: { order: 'asc' } } },
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const name = String(body?.name ?? project.title).slice(0, 120)

    const template = await prisma.template.create({
      data: {
        vendorId: vendor.id,
        type: 'PLAYBOOK',
        name,
        content: {
          milestones: project.milestones.map((m: any) => ({
            title: m.title, description: m.description, owner: m.owner, order: m.order,
          })),
        },
      },
    })
    return NextResponse.json({ ok: true, templateId: template.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}
