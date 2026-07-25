import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'
import { clearClientSession } from '@/lib/client-session'

export async function POST() {
  // Clear both vendor and client cookies so a returning vendor never inherits
  // a stale role or a leftover client portal session from the same browser.
  await clearSession()
  await clearClientSession()
  return NextResponse.json({ success: true })
}
