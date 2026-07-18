import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { trackEvent } from '@/lib/analytics'
import { breakdown } from '@/lib/payments'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10' as any,
})
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

/**
 * STAGE 4 — the ONLY place a Stripe payment is marked COMPLETED.
 * Signature is verified first; an unverified body is rejected.
 */
export async function POST(req: NextRequest) {
  const payload = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent

      // Idempotent: only act if this intent is still pending.
      const payment = await prisma.payment.findFirst({ where: { stripeId: pi.id } })
      if (payment && payment.status !== 'COMPLETED') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED', paidAt: new Date() },
        })

        const b = await breakdown(payment.projectId)
        const newStatus = b?.fullyPaid ? 'FULLY_PAID' : 'DEPOSIT_PAID'
        await prisma.project.update({
          where: { id: payment.projectId },
          data: { status: newStatus },
        })
        await trackEvent(b?.fullyPaid ? 'fully_paid' : 'deposit_paid', {
          projectId: payment.projectId,
          metadata: { stripeId: pi.id, amount: Number(payment.amount) },
        })
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent
      await prisma.payment.updateMany({
        where: { stripeId: pi.id, status: { not: 'COMPLETED' } },
        data: { status: 'FAILED' },
      })
      await trackEvent('payment_failed', { metadata: { stripeId: pi.id } })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
