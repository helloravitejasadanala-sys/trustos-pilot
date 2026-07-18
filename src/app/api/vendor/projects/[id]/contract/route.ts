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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await ownedProject(params.id, user.id)
    const b = await req.json()
    if (!b.content || String(b.content).trim().length < 20) {
      return NextResponse.json({ error: 'Contract content is required' }, { status: 400 })
    }

    const existing = await prisma.contract.findUnique({ where: { projectId: project.id } })
    // Item 10 — a signed contract is never overwritten; editing bumps version.
    if (existing?.signedAt) {
      return NextResponse.json({ error: 'This contract is already signed and cannot be edited.' }, { status: 409 })
    }

    await prisma.contract.upsert({
      where: { projectId: project.id },
      update: { content: b.content, version: (existing?.version ?? 1) },
      create: { projectId: project.id, content: b.content },
    })
    await prisma.project.update({ where: { id: project.id }, data: { status: 'CONTRACT_SENT' } })
    await trackEvent('contract_sent', { projectId: project.id, userId: user.id })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
