import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isTestClient } from '@/lib/vendor-phase1'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireAuth(['VENDOR'])
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } })
    if (!vendor) return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 })

    const projects = await prisma.project.findMany({
      where: { vendorId: vendor.id, clientId: { not: null } },
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
    await requireAuth(['VENDOR'])
    const body = createSchema.parse(await req.json())
    const email = body.email.toLowerCase()

    const client = await prisma.user.upsert({
      where: { email },
      update: { name: body.name, role: 'CLIENT', phone: body.phone || undefined },
      create: {
        email,
        name: body.name,
        phone: body.phone || null,
        role: 'CLIENT',
        password: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
      },
      select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
    })

    return NextResponse.json({ client: { ...client, archived: client.avatar === 'archived', projects: [] } })
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    return NextResponse.json({ error: error.message || 'Error' }, { status: error.status || 500 })
  }
}
