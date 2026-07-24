import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isTestClient } from '@/lib/vendor-phase1'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

async function vendorClient(clientId: string, userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } })
  if (!vendor) throw Object.assign(new Error('Vendor profile not found'), { status: 404 })

  const linked = await prisma.project.findFirst({
    where: { vendorId: vendor.id, clientId },
    include: { client: true },
  })
  if (!linked?.client) throw Object.assign(new Error('Client not found'), { status: 404 })
  return { vendor, client: linked.client }
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().max(30).optional(),
  archive: z.boolean().optional(),
  unarchive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const { client } = await vendorClient(params.id, user.id)
    const body = patchSchema.parse(await req.json())

    const updated = await prisma.user.update({
      where: { id: client.id },
      data: {
        name: body.name,
        email: body.email?.toLowerCase(),
        phone: body.phone,
        avatar: body.archive ? 'archived' : body.unarchive ? null : undefined,
      },
      select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
    })

    const projects = await prisma.project.findMany({
      where: { clientId: client.id },
      select: { id: true, title: true, slug: true, status: true, eventDate: true },
    })

    return NextResponse.json({
      client: { ...updated, archived: updated.avatar === 'archived', projects },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    return NextResponse.json({ error: error.message || 'Error' }, { status: error.status || 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const { vendor, client } = await vendorClient(params.id, user.id)

    if (!isTestClient(client)) {
      return NextResponse.json({ error: 'Only test clients can be deleted' }, { status: 403 })
    }

    const nonTestProjects = await prisma.project.count({
      where: {
        clientId: client.id,
        vendorId: vendor.id,
        NOT: [{ slug: { contains: '-demo' } }, { title: { contains: 'Test', mode: 'insensitive' } }],
      },
    })
    if (nonTestProjects > 0) {
      return NextResponse.json({ error: 'Cannot delete client with non-test projects' }, { status: 409 })
    }

    await prisma.project.updateMany({ where: { clientId: client.id, vendorId: vendor.id }, data: { clientId: null } })
    await prisma.user.delete({ where: { id: client.id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: error.status || 500 })
  }
}
