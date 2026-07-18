import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { trackEvent } from '@/lib/analytics'
import { breakdown } from '@/lib/payments'

export const dynamic = 'force-dynamic'

async function ownedProject(slug: string, userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } })
  if (!vendor) throw Object.assign(new Error('No vendor'), { status: 404 })
  const project = await prisma.project.findFirst({ where: { slug, vendorId: vendor.id } })
  if (!project) throw Object.assign(new Error('Not found'), { status: 404 })
  return project
}

/**
 * Vendor marks the project complete. Guarded: all milestones must be
 * done, and payment status is surfaced (not forced — a vendor may
 * complete with a balance outstanding, but it is recorded).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)

    const incomplete = await prisma.milestone.count({
      where: { projectId: project.id, completedAt: null },
    })
    if (incomplete > 0) {
      return NextResponse.json(
        { error: `${incomplete} milestone(s) still open. Complete or remove them first.` },
        { status: 409 }
      )
    }

    const b = await breakdown(project.id)
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'COMPLETED' },
    })
    await trackEvent('project_completed', {
      projectId: project.id,
      userId: user.id,
      metadata: { balanceDue: b?.balanceDue ?? null },
    })

    return NextResponse.json({ ok: true, balanceDue: b?.balanceDue ?? 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}
