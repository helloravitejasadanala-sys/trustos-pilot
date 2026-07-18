import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { trackEvent } from '@/lib/analytics'
import { amountForType, breakdown } from '@/lib/payments'

export const dynamic = 'force-dynamic'

async function ownedProject(slug: string, userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } })
  if (!vendor) throw Object.assign(new Error('No vendor'), { status: 404 })
  const project = await prisma.project.findFirst({ where: { slug, vendorId: vendor.id } })
  if (!project) throw Object.assign(new Error('Not found'), { status: 404 })
  return project
}

/**
 * Vendor records a payment taken offline (bank transfer, cash). Amount
 * is still computed server-side. Marked method 'manual' so the UI can
 * label it "recorded by vendor — not independently verified".
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)
    const body = await req.json().catch(() => ({}))
    const type: 'DEPOSIT' | 'INSTALMENT' | 'FINAL' =
      ['DEPOSIT', 'INSTALMENT', 'FINAL'].includes(body?.type) ? body.type : 'DEPOSIT'

    const amount = await amountForType(project.id, type)

    await prisma.payment.create({
      data: {
        projectId: project.id, amount, currency: 'GBP',
        type, status: 'COMPLETED', method: 'manual', paidAt: new Date(),
      },
    })

    const b = await breakdown(project.id)
    await prisma.project.update({
      where: { id: project.id },
      data: { status: b?.fullyPaid ? 'FULLY_PAID' : 'DEPOSIT_PAID' },
    })
    await trackEvent('payment_recorded_manual', { projectId: project.id, userId: user.id, metadata: { type, amount } })

    return NextResponse.json({ ok: true, amount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}
