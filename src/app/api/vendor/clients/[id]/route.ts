import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isTestClient } from '@/lib/vendor-phase1'
import { resolveVendorClient } from '@/lib/vendor-clients'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

async function vendorClient(clientId: string, userId: string) {
  return resolveVendorClient(clientId, userId)
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().max(30).optional(),
  archive: z.boolean().optional(),
  unarchive: z.boolean().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const { vendor, client } = await vendorClient(params.id, user.id)
    const projects = await prisma.project.findMany({
      where: { clientId: client.id, vendorId: vendor.id },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        eventDate: true,
        location: true,
        service: true,
        type: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        archived: client.avatar === 'archived',
        createdAt: client.createdAt,
        projects: projects.map(p => ({
          ...p,
          eventDate: p.eventDate,
        })),
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: error.status || 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const { vendor, client } = await vendorClient(params.id, user.id)
    const body = patchSchema.parse(await req.json())

    if (body.email) {
      const nextEmail = body.email.toLowerCase()
      if (nextEmail !== client.email) {
        const taken = await prisma.user.findUnique({
          where: { email: nextEmail },
          select: { id: true },
        })
        if (taken && taken.id !== client.id) {
          return NextResponse.json(
            { error: 'That email is already used by another contact. Pick a different email.' },
            { status: 409 },
          )
        }
      }
    }

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
      where: { clientId: client.id, vendorId: vendor.id },
      select: { id: true, title: true, slug: true, status: true, eventDate: true },
    })

    return NextResponse.json({
      client: { ...updated, archived: updated.avatar === 'archived', projects },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'That email is already used by another contact. Pick a different email.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message || 'Error' }, { status: error.status || 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const { vendor, client } = await vendorClient(params.id, user.id)

    if (!isTestClient(client)) {
      return NextResponse.json(
        {
          error:
            'Real clients can only be archived — permanent delete is limited to test clients.',
        },
        { status: 403 },
      )
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

    // Message.sender has no onDelete Cascade — clear sender rows before User delete.
    await prisma.$transaction(async tx => {
      await tx.message.deleteMany({ where: { senderId: client.id } })
      await tx.project.updateMany({
        where: { clientId: client.id, vendorId: vendor.id },
        data: { clientId: null },
      })
      await tx.user.delete({ where: { id: client.id } })
    })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: error.status || 500 })
  }
}
