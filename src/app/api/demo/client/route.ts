import { NextRequest, NextResponse } from 'next/server'
import { DEMO, isDemoKey } from '@/lib/demo'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

/**
 * "Open as Client" from /demo. Returns the secure invitation URL for
 * the demo project. The client then goes through the exact same
 * /p/[token] flow a real client would — no shortcut, no fake state.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const key = String(body?.key ?? '')

  if (!isDemoKey(key)) {
    return NextResponse.json({ error: 'Unknown demo' }, { status: 400 })
  }

  await trackEvent('demo_open_client', { metadata: { key } })
  return NextResponse.json({ ok: true, redirect: `/p/${DEMO[key].demoToken}` })
}
