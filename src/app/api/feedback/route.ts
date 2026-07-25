import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function trim(v: unknown, max = 500) {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const name = trim(body.name, 160) || null
    const emailRaw = trim(body.email, 200).toLowerCase()
    const email = emailRaw || null
    const message = trim(body.message, 5000)
    const page = trim(body.page, 200) || null
    const source = trim(body.source, 80) || 'public_form'
    const workspaceHint = trim(body.workspaceHint, 160) || null

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
    }

    let workspaceId: string | null = null
    if (workspaceHint) {
      const workspace = await prisma.vendorProfile.findFirst({
        where: {
          OR: [
            { slug: workspaceHint },
            { businessName: { equals: workspaceHint, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      })
      workspaceId = workspace?.id ?? null
    }

    const feedback = await prisma.pilotFeedback.create({
      data: {
        name,
        email,
        message,
        page,
        source,
        workspaceId,
        status: 'UNREAD',
      },
      select: { id: true, status: true, createdAt: true },
    })

    return NextResponse.json({ feedback }, { status: 201 })
  } catch (error: any) {
    console.error('[FEEDBACK POST]', error)
    return NextResponse.json(
      { error: error.message || 'Could not save feedback.' },
      { status: error.status || 500 },
    )
  }
}
