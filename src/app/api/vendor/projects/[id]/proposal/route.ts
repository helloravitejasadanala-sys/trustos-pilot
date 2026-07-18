import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

async function ownedProject(slug: string, userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } })
  if (!vendor) throw Object.assign(new Error('No vendor'), { status: 404 })
  const project = await prisma.project.findFirst({ where: { slug, vendorId: vendor.id } })
  if (!project) throw Object.assign(new Error('Not found'), { status: 404 })
  return project
}

// Vendor creates or updates the proposal, then sends it.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)
    const b = await req.json()

    const price = Number(b.price)
    if (!b.title || isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Title and a positive price are required' }, { status: 400 })
    }

    await prisma.proposal.upsert({
      where: { projectId: project.id },
      update: {
        title: b.title, description: b.description ?? '', price,
        items: b.items ?? [], depositPercent: b.depositPercent ?? 50,
        expiryDate: b.expiryDays ? new Date(Date.now() + b.expiryDays * 86400000) : null,
      },
      create: {
        projectId: project.id, title: b.title, description: b.description ?? '',
        price, items: b.items ?? [], depositPercent: b.depositPercent ?? 50,
        expiryDate: b.expiryDays ? new Date(Date.now() + b.expiryDays * 86400000) : null,
      },
    })
    await prisma.project.update({ where: { id: project.id }, data: { status: 'PROPOSAL_SENT' } })
    await trackEvent('proposal_sent', { projectId: project.id, userId: user.id })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
