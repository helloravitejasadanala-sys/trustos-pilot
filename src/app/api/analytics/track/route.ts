import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const trackSchema = z.object({
  event: z.string(),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = trackSchema.parse(body)

    const log = await prisma.activityLog.create({
      data: {
        action: data.event,
        event: data.event,
        projectId: data.projectId,
        userId: data.userId,
        metadata: data.metadata || {},
      },
    })

    return NextResponse.json({ success: true, log })
  } catch (error: any) {
    console.error('Track error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
