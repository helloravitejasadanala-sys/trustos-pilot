import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const ACCEPTANCE_TEXT =
  'By typing my name and confirming, I agree to the terms of this agreement.'

export async function GET() {
  try {
    const { projectId } = await requireClientSession()
    const contract = await prisma.contract.findUnique({
      where: { projectId },
      select: { content: true, version: true, signedAt: true, signedBy: true },
    })
    if (contract && !contract.signedAt) {
      await trackEvent('contract_viewed', { projectId })
    }
    return NextResponse.json({ contract, acceptanceText: ACCEPTANCE_TEXT })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}

/**
 * Accept the contract. Stage 3 item 9 — capture evidence:
 * version, SHA-256 of the exact content shown, signatory name,
 * session id, timestamp, IP, user agent, and the wording displayed.
 *
 * Item 10 — an already-signed contract is never overwritten.
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, invitationId } = await requireClientSession()
    const body = await req.json().catch(() => ({}))
    const signedBy = String(body?.signedBy ?? '').trim()
    const consent = body?.consent === true

    if (!signedBy || signedBy.length < 2) {
      return NextResponse.json({ error: 'Please type your full name.' }, { status: 400 })
    }
    if (!consent) {
      return NextResponse.json({ error: 'Please tick the box to confirm.' }, { status: 400 })
    }

    const contract = await prisma.contract.findUnique({ where: { projectId } })
    if (!contract) {
      return NextResponse.json({ error: 'No contract to sign' }, { status: 404 })
    }
    // Item 10 — never overwrite an accepted contract.
    if (contract.signedAt) {
      return NextResponse.json({ ok: true, alreadySigned: true })
    }

    const contentHash = createHash('sha256').update(contract.content).digest('hex')
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = req.headers.get('user-agent') ?? null

    await prisma.contract.update({
      where: { projectId },
      data: {
        signedAt: new Date(),
        signedBy,
        signedIp: ip,
        signedUserAgent: userAgent,
        contentHash,
        acceptanceText: ACCEPTANCE_TEXT,
        clientSessionId: invitationId,
      },
    })
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'CONTRACT_SIGNED' },
    })
    await trackEvent('contract_signed', {
      projectId,
      metadata: { signedBy, contentHash },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: err.status ?? 500 })
  }
}
