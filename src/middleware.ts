import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

/**
 * PILOT LIMITATION — this rate limiter is in-memory. On Netlify each
 * invocation may be a separate isolate, so it does NOT reliably limit
 * across requests in production. It is retained as a local safeguard
 * only. A shared store (e.g. Upstash Redis) is required before real
 * users. Tracked as issue M1.
 */
const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const WINDOW_MS = 60 * 1000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimit.get(ip)
  if (!record || now > record.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  record.count++
  return record.count > RATE_LIMIT
}

/** Verify the session cookie at the edge. Returns the role, or null. */
async function getRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('trustos_session')?.value
  if (!token) return null
  const secret = process.env.AUTH_SECRET
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      clockTolerance: 60,
    })
    return (payload.role as string) ?? null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown'

  if (path.startsWith('/api/auth/') || path.startsWith('/api/admin/')) {
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  // --- STEP 4.5 / 4.6 — server-side page guards -------------------
  // Previously /admin and /vendor were client components with no guard.
  // An anonymous visitor got a blank white page instead of a redirect.
  const isAdminPage = path === '/admin' || path.startsWith('/admin/')
  const isVendorPage = path === '/vendor' || path.startsWith('/vendor/')

  if (isAdminPage || isVendorPage) {
    const role = await getRole(request)

    // 4.5 — unauthenticated goes to /login, never a blank page.
    if (!role) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // 4.6 — a VENDOR must never reach /admin.
    if (isAdminPage && role !== 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = '/vendor'
      url.search = ''
      return NextResponse.redirect(url)
    }

    // An ADMIN hitting the vendor workspace goes to their own area.
    if (isVendorPage && role !== 'VENDOR') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/vendor/:path*',
    '/api/auth/:path*',
    '/api/admin/:path*',
    '/api/client/:path*',
    '/api/vendor/:path*',
    '/api/analytics/:path*',
    '/api/webhook/:path*',
  ],
}
