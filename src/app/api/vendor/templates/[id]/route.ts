import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function ownedTemplate(id: string, userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } })
  if (!vendor) throw Object.assign(new Error('Vendor profile not found'), { status: 404 })
  const template = await prisma.template.findFirst({ where: { id, vendorId: vendor.id } })
  if (!template) throw Object.assign(new Error('Not found'), { status: 404 })
  return template
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    await ownedTemplate(params.id, user.id)
    await prisma.template.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: e.status || 500 })
  }
}

// Duplicate an existing template.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const template = await ownedTemplate(params.id, user.id)
    const copy = await prisma.template.create({
      data: {
        vendorId: template.vendorId,
        type: template.type,
        name: `${template.name} (copy)`,
        content: template.content as any,
      },
    })
    return NextResponse.json({ template: copy })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: e.status || 500 })
  }
}
