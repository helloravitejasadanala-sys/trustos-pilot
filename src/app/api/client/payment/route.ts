import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'
import { breakdown, amountForType } from '@/lib/payments'
import { isDeclaredPaymentMethod } from '@/lib/payment-declare'
import {
  isStageCollectOpen,
  paymentTypeForStageIndex,
  usesPaymentSchedule,
} from '@/lib/payment-stages'
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
      select: { paymentMethod: true, balanceRequestedAt: true },
    })
    const method = normalizePaymentMethod(project?.paymentMethod)
    const balanceRequested = !!project?.balanceRequestedAt

    const contract = await prisma.contract.findUnique({
      where: { projectId },
      select: { signedAt: true },
    })
    const contractSigned = !!contract?.signedAt

    const stages = await prisma.paymentStage.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    })
    const schedulePath = usesPaymentSchedule(stages.length)

    const payments = await prisma.payment.findMany({
      where: { projectId },
      select: {
        id: true,
        type: true,
        status: true,
        method: true,
        amount: true,
        stageId: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const pending = payments.filter(p => p.status === 'PENDING')
    const pendingDeposit = pending.find(p => p.type === 'DEPOSIT') || null
    const pendingFinal = pending.find(p => p.type === 'FINAL' || p.type === 'INSTALMENT') || null

    const schedule = schedulePath
      ? stages.map(stage => {
          const completed = payments.find(
            p => p.stageId === stage.id && p.status === 'COMPLETED',
          )
          const waiting = payments.find(
            p => p.stageId === stage.id && p.status === 'PENDING',
          )
          const open = isStageCollectOpen(stage, { contractSigned })
          let state: 'confirmed' | 'waiting' | 'due' | 'upcoming' = 'upcoming'
          if (completed) state = 'confirmed'
          else if (waiting) state = 'waiting'
          else if (open) state = 'due'
          return {
            id: stage.id,
            name: stage.name,
            amount: Number(stage.amount),
            percent: stage.percent,
            timingLabel: stage.timingLabel,
            sortOrder: stage.sortOrder,
            state,
            pendingMethod: waiting?.method || null,
            pendingAmount: waiting ? Number(waiting.amount) : null,
          }
        })
      : null

    return NextResponse.json({
      payment: b
        ? {
            ...b,
            method,
            balanceRequested,
            stripeConfigured: isStripePortalPayAvailable(),
            stripeKeysPresent: isStripeConfigured(),
            checkoutEnvReady: isStripeCheckoutReady(),
            declared: !!(pendingDeposit || pendingFinal) ||
              payments.some(p => p.status === 'PENDING' && p.stageId),
            pendingDeposit: pendingDeposit
              ? { method: pendingDeposit.method, amount: Number(pendingDeposit.amount) }
              : null,
            pendingFinal: pendingFinal
              ? {
                  method: pendingFinal.method,
                  amount: Number(pendingFinal.amount),
                  type: pendingFinal.type,
                }
              : null,
            schedule,
            hasSchedule: schedulePath,
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
 * Schedule path: body.stageId required; amount from stage; open-gate enforced.
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await requireClientSession()
    const body = await req.json().catch(() => ({}))

    const proposal = await prisma.proposal.findUnique({ where: { projectId } })
    if (!proposal?.acceptedAt) {
      return NextResponse.json({ error: 'Accept the proposal first' }, { status: 409 })
    }
    const contract = await prisma.contract.findUnique({ where: { projectId } })
    if (!contract?.signedAt) {
      return NextResponse.json({ error: 'Sign the contract first' }, { status: 409 })
    }

    const stages = await prisma.paymentStage.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    })
    const schedulePath = usesPaymentSchedule(stages.length)
    const stageId = typeof body?.stageId === 'string' ? body.stageId.trim() : ''

    // --- Schedule declare ----------------------------------------------
    if (schedulePath) {
      if (!stageId) {
        return NextResponse.json(
          { error: 'Choose which payment stage you are declaring.' },
          { status: 400 },
        )
      }
      const stageIndex = stages.findIndex(s => s.id === stageId)
      if (stageIndex < 0) {
        return NextResponse.json({ error: 'Payment stage not found' }, { status: 404 })
      }
      const stage = stages[stageIndex]
      if (!isStageCollectOpen(stage, { contractSigned: true })) {
        return NextResponse.json(
          { error: 'Your vendor has not asked for this payment yet.' },
          { status: 409 },
        )
      }

      const alreadyDone = await prisma.payment.findFirst({
        where: { projectId, stageId: stage.id, status: 'COMPLETED' },
        select: { id: true },
      })
      if (alreadyDone) {
        return NextResponse.json(
          { error: 'This stage is already confirmed.' },
          { status: 409 },
        )
      }

      if (body?.mode === 'manual') {
        if (!isDeclaredPaymentMethod(body?.declaredMethod)) {
          return NextResponse.json(
            { error: 'Choose how you paid: bank transfer, cash, or card in person.' },
            { status: 400 },
          )
        }
        const type = paymentTypeForStageIndex(stageIndex, stages.length)
        const amount = Number(stage.amount)
        const existing = await prisma.payment.findFirst({
          where: { projectId, stageId: stage.id, status: 'PENDING' },
        })
        if (!existing) {
          await prisma.payment.create({
            data: {
              projectId,
              stageId: stage.id,
              type,
              amount,
              status: 'PENDING',
              method: body.declaredMethod,
            },
          })
          await trackEvent('client_declared_payment', {
            projectId,
            metadata: { type, amount, method: body.declaredMethod, stageId: stage.id },
          })
        }
        return NextResponse.json({ ok: true, declared: true, stageId: stage.id })
      }

      return NextResponse.json(
        {
          error:
            'Online card payment is not available. Choose how you paid below and wait for your vendor to confirm.',
        },
        { status: 503 },
      )
    }

    // --- Legacy DEPOSIT / FINAL ----------------------------------------
    const type: 'DEPOSIT' | 'INSTALMENT' | 'FINAL' =
      ['DEPOSIT', 'INSTALMENT', 'FINAL'].includes(body?.type) ? body.type : 'DEPOSIT'

    if (body?.mode === 'manual') {
      if (!isDeclaredPaymentMethod(body?.declaredMethod)) {
        return NextResponse.json(
          { error: 'Choose how you paid: bank transfer, cash, or card in person.' },
          { status: 400 },
        )
      }

      if (type === 'FINAL' || type === 'INSTALMENT') {
        const gate = await prisma.project.findUnique({
          where: { id: projectId },
          select: { balanceRequestedAt: true },
        })
        if (!gate?.balanceRequestedAt) {
          return NextResponse.json(
            { error: 'Your vendor has not asked for the balance yet.' },
            { status: 409 },
          )
        }
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

    if (!isStripePortalPayAvailable()) {
      return NextResponse.json(
        {
          error:
            'Online card payment is not available. Choose how you paid below and wait for your vendor to confirm.',
        },
        { status: 503 },
      )
    }

    if (type === 'FINAL' || type === 'INSTALMENT') {
      const gate = await prisma.project.findUnique({
        where: { id: projectId },
        select: { balanceRequestedAt: true },
      })
      if (!gate?.balanceRequestedAt) {
        return NextResponse.json(
          { error: 'Your vendor has not asked for the balance yet.' },
          { status: 409 },
        )
      }
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
