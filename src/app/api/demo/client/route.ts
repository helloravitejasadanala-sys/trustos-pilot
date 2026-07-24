import { NextRequest, NextResponse } from 'next/server'
import { DEMO, isDemoKey } from '@/lib/demo'
import { ensureDemoInvitation } from '@/lib/invitations'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

/**
 * "Open as Client" from /demo. Returns the secure invitation URL for
 * the demo project. The client then goes through the exact same
 * /p/[token] flow a real client would — no shortcut, no fake state.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const key = String(body?.key ?? '')

    if (!isDemoKey(key)) {
      return NextResponse.json({ error: 'Unknown demo' }, { status: 400 })
    }

    const invitation = await ensureDemoInvitation(key)
    if (!invitation) {
      return NextResponse.json(
        { error: 'Demo data not found. The database may need seeding.' },
        { status: 404 }
      )
    }

    await trackEvent('demo_open_client', { metadata: { key } })
    return NextResponse.json({ ok: true, redirect: `/p/${DEMO[key].demoToken}` })
  } catch (error: any) {
    console.error('Demo client error:', error)
    return NextResponse.json(
      { error: error.message || 'Could not open demo client journey.' },
      { status: 500 }
    )
  }
}
