import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'
import { breakdown, amountForType } from '@/lib/payments'
import { isStripeConfigured, normalizePaymentMethod } from '@/lib/stripe-config'

export const dynamic = 'force-dynamic'

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2024-04-10' as any })
}

// What is owed, and HOW it is paid. Read-only. The client learns the
// payment mode (manual / stripe / free) and whether Stripe is available,
// so the portal can show the right panel — never a broken card button.
export async function GET() {
  try {
    const { projectId } = await requireClientSession()
    const b = await breakdown(projectId)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { paymentMethod: true },
    })
    const method = normalizePaymentMethod(project?.paymentMethod)
    // Has the client already told the vendor they've paid (manual)?
    const declared = await prisma.payment.findFirst({
      where: { projectId, status: 'PENDING' },
      select: { id: true },
    })
    return NextResponse.json({
      payment: b
        ? { ...b, method, stripeConfigured: isStripeConfigured(), declared: !!declared }
        : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}

/**
 * Create a Stripe PaymentIntent (test mode). The amount is computed
 * server-side from the proposal; the browser sends only the TYPE.
 *
 * This does NOT mark anything paid. The payment row is PENDING until
 * the Stripe webhook confirms payment_intent.succeeded.
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession()
    const body = await req.json().catch(() => ({}))
    const type: 'DEPOSIT' | 'INSTALMENT' | 'FINAL' =
      ['DEPOSIT', 'INSTALMENT', 'FINAL'].includes(body?.type) ? body.type : 'DEPOSIT'

    // Gate: proposal accepted and contract signed before any payment.
    const proposal = await prisma.proposal.findUnique({ where: { projectId } })
    if (!proposal?.acceptedAt) {
      return NextResponse.json({ error: 'Accept the proposal first' }, { status: 409 })
    }
    const contract = await prisma.contract.findUnique({ where: { projectId } })
    if (!contract?.signedAt) {
      return NextResponse.json({ error: 'Sign the contract first' }, { status: 409 })
    }

    // --- MANUAL mode ------------------------------------------------
    // The client tells the vendor they've paid (bank transfer / cash).
    // This does NOT advance the project — it records a PENDING payment
    // for the vendor to confirm. Idempotent: only one pending row.
    if (body?.mode === 'manual') {
      const amount = await amountForType(projectId, type)
      const existing = await prisma.payment.findFirst({
        where: { projectId, type, status: 'PENDING' },
      })
      if (!existing) {
        await prisma.payment.create({
          data: { projectId, type, amount, status: 'PENDING', method: 'manual' },
        })
        await trackEvent('client_declared_payment', { projectId, metadata: { type, amount } })
      }
      return NextResponse.json({ ok: true, declared: true })
    }

    // Server computes the amount. Throws 409 if not payable.
    const amount = await amountForType(projectId, type)

    const s = stripe()
    if (!s) {
      return NextResponse.json(
        { error: 'Card payments are not configured. Ask your vendor to record payment manually.' },
        { status: 503 }
      )
    }

    const intent = await s.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'gbp',
      automatic_payment_methods: { enabled: true },
      metadata: { projectId, paymentType: type },
    })

    // Record as PENDING. The webhook flips it to COMPLETED.
    await prisma.payment.create({
      data: {
        projectId,
        stripeId: intent.id,
        amount,
        currency: 'GBP',
        type,
        status: 'PENDING',
        method: 'stripe',
      },
    })
    await trackEvent('payment_requested', { projectId, metadata: { type, amount } })

    return NextResponse.json({ clientSecret: intent.client_secret, amount })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Payment error' },
      { status: err.status ?? 500 }
    )
  }
}
