import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { defaultAgreementContent } from '@/lib/agreement-template'
import { getServiceProfile } from '@/lib/service-profiles'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } },
      include: {
        proposal: true,
        client: { select: { name: true } },
        vendor: { select: { businessName: true, primaryService: true } },
        contract: true,
      },
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!project.proposal?.acceptedAt) {
      return NextResponse.json({ error: 'Client must accept the quote before you send the agreement' }, { status: 409 })
    }

    const content =
      (project.contract?.content || '').trim() ||
      defaultAgreementContent({
        businessName: project.vendor.businessName,
        clientName: project.client?.name,
        projectTitle: project.title,
        price: Number(project.proposal.price),
        deposit: Number(project.proposal.depositAmount ?? project.proposal.deposit ?? 0),
        eventDate: project.eventDate,
        location: project.location,
        serviceLabel: getServiceProfile(project.vendor.primaryService).label,
      })

    await prisma.contract.upsert({
      where: { projectId: project.id },
      update: {
        sentAt: new Date(),
        ...(!(project.contract?.content || '').trim() ? { content } : {}),
      },
      create: { projectId: project.id, sentAt: new Date(), content },
    })

    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'CONTRACT_SENT' },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}
