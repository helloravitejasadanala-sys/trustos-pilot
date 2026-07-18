import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

/**
 * Custom JWT authentication built on `jose`. This is NOT NextAuth,
 * despite the historic variable naming. AUTH_SECRET is a plain HS256
 * signing key.
 *
 * STEP 4.8 — there is NO fallback secret. AUTH_SECRET is the only
 * accepted source. A missing secret fails loudly rather than
 * degrading to a default or a second variable name.
 */

let cachedSecret: Uint8Array | null = null

/**
 * Resolved lazily, never at module scope. Evaluating this at import
 * time made `next build` fail during route collection whenever the
 * secret was absent from the build environment.
 */
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error(
      'AUTH_SECRET environment variable is required. ' +
      'Generate one with: openssl rand -base64 32'
    )
  }
  if (secret.length < 32) {
    throw new Error('AUTH_SECRET must be at least 32 characters.')
  }

  cachedSecret = new TextEncoder().encode(secret)
  return cachedSecret
}

export async function createToken(payload: object) {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { clockTolerance: 60 })
    return payload
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = cookies()
  const token = cookieStore.get('trustos_session')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.sub) return null

  const user = await prisma.user.findUnique({
    where: { id: session.sub as string },
    include: { vendorProfile: true, adminProfile: true },
  })
  return user
}

/**
 * STEP 4.7 — suspended users are rejected.
 *
 * The session JWT lives for 7 days and is stateless, so suspension
 * cannot be enforced against the token. It is checked against the
 * database on every authenticated request instead.
 */
export async function requireAuth(roles?: string[]) {
  const user = await getCurrentUser()

  if (!user) {
    const err = new Error('Unauthorized') as any
    err.status = 401
    throw err
  }

  if (user.role === 'VENDOR' && user.vendorProfile && !user.vendorProfile.isActive) {
    const err = new Error('This account has been suspended.') as any
    err.status = 403
    throw err
  }

  if (roles && !roles.includes(user.role)) {
    const err = new Error('Forbidden') as any
    err.status = 403
    throw err
  }

  return user
}

export async function setSession(userId: string, role: string) {
  const token = await createToken({ sub: userId, role })
  const cookieStore = cookies()
  cookieStore.set('trustos_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = cookies()
  cookieStore.delete('trustos_session')
}
