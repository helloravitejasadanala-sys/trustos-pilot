import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { trackEvent } from '@/lib/analytics'
import { isStripeCheckoutReady, normalizePaymentMethod } from '@/lib/stripe-config'

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

    // Section L — exactly three modes: MANUAL, STRIPE, FREE_COLLABORATION.
    // Legacy 'cash' collapses to 'manual'. Stripe can only be selected when
    // a valid Stripe configuration is present, so a placeholder key can
    // never reach the client.
    const method = normalizePaymentMethod(b.method)
    const free = method === 'free'

    // Card checkout stays off until Elements are wired (STRIPE_CHECKOUT_ENABLED).
    if (method === 'stripe' && !isStripeCheckoutReady()) {
      return NextResponse.json(
        { error: 'Online card payment is not available in this pilot yet. Choose Manual transfer or Free collaboration.' },
        { status: 400 }
      )
    }

    if (!b.title || !String(b.title).trim()) {
      return NextResponse.json({ error: 'Add a title for the quote' }, { status: 400 })
    }

    const price = free ? 0 : Number(b.price)
    const deposit = free ? 0 : Number(b.deposit ?? b.depositAmount ?? 0)

    // Money locked once a COMPLETED deposit (or free settlement) exists.
    const moneyLockedPay = await prisma.payment.findFirst({
      where: {
        projectId: project.id,
        status: 'COMPLETED',
        OR: [{ type: 'DEPOSIT' }, { method: 'free' }],
      },
      select: { id: true },
    })
    const moneyLocked = !!moneyLockedPay

    if (moneyLocked) {
      const existing = await prisma.proposal.findUnique({ where: { projectId: project.id } })
      if (!existing) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      }
      const existingPrice = Number(existing.price)
      const existingDeposit = Number(existing.depositAmount ?? (existing as { deposit?: unknown }).deposit ?? 0)
      const existingMethod = normalizePaymentMethod(project.paymentMethod)
      if (price !== existingPrice || deposit !== existingDeposit || method !== existingMethod) {
        return NextResponse.json(
          { error: "This quote's amounts are locked because a deposit has been paid." },
          { status: 400 },
        )
      }
      await prisma.proposal.update({
        where: { projectId: project.id },
        data: {
          title: b.title,
          description: b.description ?? '',
        },
      })
      await trackEvent('proposal_sent', {
        projectId: project.id,
        userId: user.id,
        metadata: { method: existingMethod, price: existingPrice, deposit: existingDeposit, moneyLocked: true },
      })
      return NextResponse.json({ ok: true, method: existingMethod, free: existingMethod === 'free', moneyLocked: true })
    }

    if (!free) {
      if (isNaN(price) || price <= 0) {
        return NextResponse.json({ error: 'Enter a valid total amount' }, { status: 400 })
      }
      if (isNaN(deposit) || deposit <= 0) {
        return NextResponse.json(
          { error: 'Enter a deposit greater than £0, or choose Free collaboration.' },
          { status: 400 },
        )
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

    // Never rewind status after money is settled (or terminal).
    const preMoneyLane = new Set([
      'LEAD',
      'QUESTIONNAIRE_SENT',
      'QUESTIONNAIRE_COMPLETED',
      'PROPOSAL_SENT',
      'PROPOSAL_ACCEPTED',
      'CONTRACT_SENT',
      'CONTRACT_SIGNED',
    ])
    await prisma.project.update({
      where: { id: project.id },
      data: preMoneyLane.has(project.status)
        ? { status: 'PROPOSAL_SENT', paymentMethod: method }
        : { paymentMethod: method },
    })
    await trackEvent('proposal_sent', { projectId: project.id, userId: user.id, metadata: { method, price, deposit } })
    return NextResponse.json({ ok: true, method, free })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
