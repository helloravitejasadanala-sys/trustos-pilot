import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'
import { breakdown, amountForType } from '@/lib/payments'
import { isDeclaredPaymentMethod } from '@/lib/payment-declare'
import {
  isStripeCheckoutReady,
  isStripeConfigured,
  isStripePortalPayAvailable,
  normalizePaymentMethod,
} from '@/lib/stripe-config'

export const dynamic = 'force-dynamic'

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2024-04-10' as any })
}

// What is owed, and HOW it is paid. Read-only.
export async function GET() {
  try {
    const { projectId } = await requireClientSession()
    const b = await breakdown(projectId)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { paymentMethod: true },
    })
    const method = normalizePaymentMethod(project?.paymentMethod)

    const pending = await prisma.payment.findMany({
      where: { projectId, status: 'PENDING' },
      select: { id: true, type: true, method: true, amount: true },
      orderBy: { createdAt: 'desc' },
    })

    const pendingDeposit = pending.find(p => p.type === 'DEPOSIT') || null
    const pendingFinal = pending.find(p => p.type === 'FINAL' || p.type === 'INSTALMENT') || null

    return NextResponse.json({
      payment: b
        ? {
            ...b,
            method,
            // Portal never shows Pay online until Elements exist (ignore env alone).
            stripeConfigured: isStripePortalPayAvailable(),
            stripeKeysPresent: isStripeConfigured(),
            checkoutEnvReady: isStripeCheckoutReady(),
            declared: !!(pendingDeposit || pendingFinal),
            pendingDeposit: pendingDeposit
              ? { method: pendingDeposit.method, amount: Number(pendingDeposit.amount) }
              : null,
            pendingFinal: pendingFinal
              ? { method: pendingFinal.method, amount: Number(pendingFinal.amount), type: pendingFinal.type }
              : null,
          }
        : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}

/**
 * Manual declare (default) or Stripe PaymentIntent when portal pay is available.
 * Does NOT mark paid — PENDING until vendor confirm or webhook.
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession()
    const body = await req.json().catch(() => ({}))
    const type: 'DEPOSIT' | 'INSTALMENT' | 'FINAL' =
      ['DEPOSIT', 'INSTALMENT', 'FINAL'].includes(body?.type) ? body.type : 'DEPOSIT'

    const proposal = await prisma.proposal.findUnique({ where: { projectId } })
    if (!proposal?.acceptedAt) {
      return NextResponse.json({ error: 'Accept the proposal first' }, { status: 409 })
    }
    const contract = await prisma.contract.findUnique({ where: { projectId } })
    if (!contract?.signedAt) {
      return NextResponse.json({ error: 'Sign the contract first' }, { status: 409 })
    }

    // --- MANUAL declare ------------------------------------------------
    if (body?.mode === 'manual') {
      if (!isDeclaredPaymentMethod(body?.declaredMethod)) {
        return NextResponse.json(
          { error: 'Choose how you paid: bank transfer, cash, or card in person.' },
          { status: 400 },
        )
      }

      const amount = await amountForType(projectId, type)
      const existing = await prisma.payment.findFirst({
        where: { projectId, type, status: 'PENDING' },
      })
      if (!existing) {
        await prisma.payment.create({
          data: {
            projectId,
            type,
            amount,
            status: 'PENDING',
            method: body.declaredMethod,
          },
        })
        await trackEvent('client_declared_payment', {
          projectId,
          metadata: { type, amount, method: body.declaredMethod },
        })
      }
      return NextResponse.json({ ok: true, declared: true })
    }

    // Online path — blocked until Elements are wired (not merely env-flagged).
    if (!isStripePortalPayAvailable()) {
      return NextResponse.json(
        {
          error:
            'Online card payment is not available. Choose how you paid below and wait for your vendor to confirm.',
        },
        { status: 503 },
      )
    }

    const amount = await amountForType(projectId, type)

    if (!isStripeCheckoutReady()) {
      return NextResponse.json(
        { error: 'Online card payment is not available yet.' },
        { status: 503 },
      )
    }

    const s = stripe()
    if (!s) {
      return NextResponse.json(
        { error: 'Card payments are not configured. Ask your vendor to record payment manually.' },
        { status: 503 },
      )
    }

    const intent = await s.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'gbp',
      automatic_payment_methods: { enabled: true },
      metadata: { projectId, paymentType: type },
    })

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
      { status: err.status ?? 500 },
    )
  }
}
