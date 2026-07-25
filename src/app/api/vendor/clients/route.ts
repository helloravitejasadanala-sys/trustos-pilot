import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ALL_DEMO_PROJECT_SLUGS, isDemoVendorEmail } from '@/lib/demo'
import { resolveOrCreateClient } from '@/lib/vendor-clients'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } })
    if (!vendor) return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 })

    const showDemo = isDemoVendorEmail(user.email)
    const projects = await prisma.project.findMany({
      where: {
        vendorId: vendor.id,
        clientId: { not: null },
        ...(showDemo ? {} : { slug: { notIn: ALL_DEMO_PROJECT_SLUGS } }),
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const map = new Map<string, any>()
    for (const p of projects) {
      if (!p.client) continue
      const existing = map.get(p.client.id)
      const entry = existing ?? {
        id: p.client.id,
        name: p.client.name,
        email: p.client.email,
        phone: p.client.phone,
        archived: p.client.avatar === 'archived',
        createdAt: p.client.createdAt,
        projects: [] as any[],
      }
      entry.projects.push({ id: p.id, title: p.title, slug: p.slug, status: p.status, eventDate: p.eventDate })
      map.set(p.client.id, entry)
    }

    const orphanLogs = await prisma.activityLog.findMany({
      where: {
        userId: user.id,
        event: 'client_directory_added',
      },
      select: { metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    const orphanIds = Array.from(new Set(
      orphanLogs
        .map((l) => (l.metadata as any)?.clientId as string | undefined)
        .filter((id): id is string => !!id && !map.has(id))
    ))
    if (orphanIds.length) {
      const orphans = await prisma.user.findMany({
        where: { id: { in: orphanIds }, role: 'CLIENT' },
        select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
      })
      for (const c of orphans) {
        map.set(c.id, {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          archived: c.avatar === 'archived',
          createdAt: c.createdAt,
          projects: [],
        })
      }
    }

    return NextResponse.json({ clients: Array.from(map.values()) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: error.status || 500 })
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().trim().max(30).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } })
    if (!vendor) return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 })

    const body = createSchema.parse(await req.json())
    const { client, created, reused } = await resolveOrCreateClient({
      vendorId: vendor.id,
      vendorUserId: user.id,
      vendorEmail: user.email,
      name: body.name,
      email: body.email,
      phone: body.phone,
    })

    if (created || reused) {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          event: 'client_directory_added',
          metadata: { clientId: client.id, email: client.email, reused },
        },
      })
    }

    return NextResponse.json({
      client: { ...client, archived: client.avatar === 'archived', projects: [] },
      created,
      reused,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    return NextResponse.json({ error: error.message || 'Error' }, { status: error.status || 500 })
  }
}
