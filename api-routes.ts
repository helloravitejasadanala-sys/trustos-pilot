// ============================================
// API ROUTES TO ADD TO YOUR PROJECT
// ============================================
//
// Create these files in your src/app/api directory:
//
// src/app/api/vendor/projects/[id]/questionnaire/route.ts
// src/app/api/vendor/projects/[id]/contract/route.ts
// src/app/api/vendor/projects/[id]/payment/route.ts
// src/app/api/vendor/projects/[id]/complete/route.ts
// src/app/api/vendor/projects/[id]/review-request/route.ts
// src/app/api/vendor/projects/[id]/learning/route.ts
// src/app/api/vendor/projects/[id]/milestones/[milestoneId]/complete/route.ts
//
// ============================================

// --- src/app/api/vendor/projects/[id]/questionnaire/route.ts ---
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } }
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Check if questionnaire already exists
    const existing = await prisma.questionnaire.findFirst({
      where: { projectId: project.id }
    })

    if (existing) {
      // Just update status
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'QUESTIONNAIRE_SENT' }
      })
    } else {
      // Create new questionnaire
      await prisma.questionnaire.create({
        data: { projectId: project.id, startedAt: new Date() }
      })
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'QUESTIONNAIRE_SENT' }
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// --- src/app/api/vendor/projects/[id]/contract/route.ts ---
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } }
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Create or update contract
    await prisma.contract.upsert({
      where: { projectId: project.id },
      update: { sentAt: new Date() },
      create: { projectId: project.id, sentAt: new Date(), content: '' }
    })

    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'CONTRACT_SENT' }
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// --- src/app/api/vendor/projects/[id]/payment/route.ts ---
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const { type, method } = await req.json()

    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } },
      include: { proposal: true }
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const amount = type === 'DEPOSIT' 
      ? (project.proposal?.deposit || 0)
      : (project.proposal?.price || 0) - (project.proposal?.deposit || 0)

    await prisma.payment.create({
      data: {
        projectId: project.id,
        type,
        amount,
        status: 'COMPLETED',
        method: method || 'manual',
        paidAt: new Date(),
      }
    })

    // Update project status
    const newStatus = type === 'DEPOSIT' ? 'DEPOSIT_PAID' : 'FULLY_PAID'
    await prisma.project.update({
      where: { id: project.id },
      data: { status: newStatus }
    })

    return NextResponse.json({ ok: true, status: newStatus })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// --- src/app/api/vendor/projects/[id]/complete/route.ts ---
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } }
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'COMPLETED', completedAt: new Date() }
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// --- src/app/api/vendor/projects/[id]/review-request/route.ts ---
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } }
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Create a review request (could send email, create notification, etc.)
    await prisma.message.create({
      data: {
        projectId: project.id,
        senderId: user.id,
        content: 'Your vendor has requested a review. Please share your experience.',
        type: 'REVIEW_REQUEST'
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// --- src/app/api/vendor/projects/[id]/learning/route.ts ---
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const { answers } = await req.json()

    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } }
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Store learning data
    await prisma.learning.create({
      data: {
        projectId: project.id,
        vendorId: project.vendorId,
        wentWell: answers.wentWell || '',
        problems: answers.problems || '',
        solution: answers.solution || '',
        missing: answers.missing || '',
        venueAccurate: answers.venueAccurate || '',
        advice: answers.advice || '',
        setupTime: answers.setupTime || '',
        clientJourney: answers.clientJourney || '',
        rating: answers.rating ? parseInt(answers.rating) : null,
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// --- src/app/api/vendor/projects/[id]/milestones/[milestoneId]/complete/route.ts ---
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: { id: string; milestoneId: string } }) {
  try {
    const user = await requireAuth(['VENDOR'])
    const project = await prisma.project.findFirst({
      where: { id: params.id, vendor: { userId: user.id } }
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.milestone.update({
      where: { id: params.milestoneId },
      data: { completedAt: new Date() }
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
