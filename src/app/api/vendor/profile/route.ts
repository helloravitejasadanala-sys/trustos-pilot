import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  primaryService: z
    .enum(['PHOTOGRAPHY', 'LIVE_STREAMING', 'MAKEUP_ARTIST', 'DJ', 'PHOTO_EDITOR', 'VIDEO_EDITOR'])
    .optional(),
})

/** Update workspace profile fields used by Service Profiles. */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(['VENDOR'])
    const body = await req.json().catch(() => ({}))
    const data = patchSchema.parse(body)

    if (!data.primaryService) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const vendorProfile = await prisma.vendorProfile.update({
      where: { userId: user.id },
      data: { primaryService: data.primaryService as any },
    })

    return NextResponse.json({ vendorProfile })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json(
      { error: error.message || 'Could not update profile' },
      { status: error.status || 500 },
    )
  }
}
