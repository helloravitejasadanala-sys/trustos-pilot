import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ARCHIVED_PREFIX, isTestProject } from '@/lib/vendor-phase1'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

async function ownedProject(slug: string, userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } })
  if (!vendor) throw Object.assign(new Error('Vendor profile not found'), { status: 404 })
  const project = await prisma.project.findFirst({ where: { slug, vendorId: vendor.id } })
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 })
  return project
}

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  eventDate: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  archive: z.boolean().optional(),
  unarchive: z.boolean().optional(),
  cancel: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)
    const body = patchSchema.parse(await req.json())

    let notes = project.notes
    if (body.archive) {
      notes = notes?.trimStart().startsWith(ARCHIVED_PREFIX) ? notes : `${ARCHIVED_PREFIX} ${notes ?? ''}`.trim()
    }
    if (body.unarchive) {
      notes = (notes ?? '').replace(new RegExp(`^\\${ARCHIVED_PREFIX}\\s*`), '').trim() || null
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        title: body.title,
        eventDate: body.eventDate === null ? null : body.eventDate ? new Date(body.eventDate) : undefined,
        location: body.location === null ? null : body.location,
        notes: body.notes ?? notes,
        clientId: body.clientId === null ? null : body.clientId,
        status: body.cancel ? 'CANCELLED' : undefined,
      },
    })

    return NextResponse.json({ project: updated })
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    return NextResponse.json({ error: error.message || 'Error' }, { status: error.status || 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)
    if (!isTestProject(project)) {
      return NextResponse.json({ error: 'Only test projects can be deleted' }, { status: 403 })
    }
    await prisma.project.delete({ where: { id: project.id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: error.status || 500 })
  }
}
