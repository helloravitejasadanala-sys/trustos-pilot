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

// Vendor creates or updates the proposal (the quote), then sends it.
//
// Phase 5 rules:
//  - amounts are numbers only, never negative
//  - the deposit can never exceed the total
//  - Free Collaboration forces £0 total and £0 deposit
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)
    const b = await req.json()

    const method: string = ['cash', 'stripe', 'free'].includes(b.method) ? b.method : 'cash'
    const free = method === 'free'

    if (!b.title || !String(b.title).trim()) {
      return NextResponse.json({ error: 'Add a title for the quote' }, { status: 400 })
    }

    const price = free ? 0 : Number(b.price)
    const deposit = free ? 0 : Number(b.deposit ?? b.depositAmount ?? 0)

    if (!free) {
      if (isNaN(price) || price <= 0) {
        return NextResponse.json({ error: 'Enter a valid total amount' }, { status: 400 })
      }
      if (isNaN(deposit) || deposit < 0) {
        return NextResponse.json({ error: 'Enter a valid deposit amount' }, { status: 400 })
      }
      if (deposit > price) {
        return NextResponse.json({ error: 'The deposit cannot be more than the total' }, { status: 400 })
      }
    }

    await prisma.proposal.upsert({
      where: { projectId: project.id },
      update: {
        title: b.title, description: b.description ?? '', price,
        items: b.items ?? [], depositAmount: deposit, depositPercent: null,
        expiryDate: b.expiryDays ? new Date(Date.now() + b.expiryDays * 86400000) : null,
      },
      create: {
        projectId: project.id, title: b.title, description: b.description ?? '',
        price, items: b.items ?? [], depositAmount: deposit,
        expiryDate: b.expiryDays ? new Date(Date.now() + b.expiryDays * 86400000) : null,
      },
    })
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'PROPOSAL_SENT', paymentMethod: method },
    })
    await trackEvent('proposal_sent', { projectId: project.id, userId: user.id, metadata: { method, price, deposit } })
    return NextResponse.json({ ok: true, method, free })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
