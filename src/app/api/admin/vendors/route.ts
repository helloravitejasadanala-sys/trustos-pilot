import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAuth(['ADMIN'])

    const vendors = await prisma.vendorProfile.findMany({
      include: {
        user: { select: { name: true, email: true, createdAt: true } },
        _count: { select: { projects: true, packages: true, templates: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ vendors })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}
