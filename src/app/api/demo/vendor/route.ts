import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { setSession } from '@/lib/auth'
import { clearClientSession } from '@/lib/client-session'
import { DEMO, isDemoKey, DEMO_VENDOR_EMAILS } from '@/lib/demo'
import { ensureDemoInvitation } from '@/lib/invitations'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

/**
 * "Open as Vendor" from /demo. Mints a real vendor session for a DEMO
 * vendor only. No password crosses the browser. Hard-scoped: the email
 * must be one of the two demo vendors, verified twice (allowlist + the
 * seeded account), so this can never open a real vendor account.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const key = String(body?.key ?? '')

    if (!isDemoKey(key)) {
      return NextResponse.json({ error: 'Unknown demo' }, { status: 400 })
    }

    const target = DEMO[key]
    if (!DEMO_VENDOR_EMAILS.includes(target.vendorEmail)) {
      return NextResponse.json({ error: 'Not a demo vendor' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { email: target.vendorEmail },
      select: { id: true, role: true, email: true },
    })

    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json(
        { error: 'Demo data not found. The database may need seeding.' },
        { status: 404 }
      )
    }

    await ensureDemoInvitation(key)
    await setSession(user.id, user.role)
    await clearClientSession()
    await trackEvent('demo_open_vendor', { metadata: { key } })

    return NextResponse.json({ ok: true, redirect: `/vendor/projects/${target.projectSlug}` })
  } catch (error: any) {
    console.error('Demo vendor error:', error)
    return NextResponse.json(
      { error: error.message || 'Could not open demo vendor session.' },
      { status: 500 }
    )
  }
}
