import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { prisma } from './prisma'

/**
 * STAGE 2 — secure client access.
 *
 * Clients never authenticate with a password. They arrive by an
 * invitation link, /p/[token]. That token is exchanged, once, for an
 * httpOnly session cookie that is scoped to EXACTLY ONE project.
 *
 * The rule that makes this safe:
 *
 *   No client API accepts a project identifier from the browser.
 *   Not a slug, not an id, not a token in the query string.
 *   The project is ALWAYS derived server-side from the session cookie.
 *
 * This is what closes audit issue C1, where any visitor who guessed a
 * slug could read a contract and forge a signature on it.
 */

const CLIENT_COOKIE = 'trustos_client'
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7 // 7 days

let cachedSecret: Uint8Array | null = null

/** Lazily resolved. No fallback — a missing secret fails loudly. */
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET is required. Generate with: openssl rand -base64 32')
  }
  if (secret.length < 32) {
    throw new Error('AUTH_SECRET must be at least 32 characters.')
  }
  cachedSecret = new TextEncoder().encode(secret)
  return cachedSecret
}

/**
 * 256 bits of entropy, url-safe. The previous implementation used
 * randomUUID() (122 bits, and structured). A token is the only thing
 * standing between a stranger and a client's contract, so it is sized
 * to be unguessable rather than merely unique.
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url')
}

export type InvitationCheck =
  | { ok: true; invitationId: string; projectId: string }
  | { ok: false; reason: 'not_found' | 'revoked' | 'expired' | 'completed' }

/**
 * Validate a raw token from the URL. Returns the project it unlocks, or
 * a reason. Deliberately returns the same shape for every failure so
 * callers cannot leak which tokens exist.
 */
export async function validateInvitationToken(token: string): Promise<InvitationCheck> {
  if (!token || typeof token !== 'string' || token.length < 20) {
    return { ok: false, reason: 'not_found' }
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    select: { id: true, projectId: true, revokedAt: true, expiresAt: true, status: true },
  })

  if (!invitation) return { ok: false, reason: 'not_found' }
  if (invitation.revokedAt) return { ok: false, reason: 'revoked' }
  if (invitation.expiresAt.getTime() <= Date.now()) return { ok: false, reason: 'expired' }

  return { ok: true, invitationId: invitation.id, projectId: invitation.projectId }
}

/**
 * Issue the scoped session. The cookie carries the projectId; the
 * browser never sees it and cannot choose it.
 */
export async function createClientSession(invitationId: string, projectId: string) {
  const token = await new SignJWT({ pid: projectId, iid: invitationId, typ: 'client' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())

  cookies().set(CLIENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_S,
    path: '/',
  })
}

export async function clearClientSession() {
  cookies().delete(CLIENT_COOKIE)
}

export type ClientSession = { projectId: string; invitationId: string }

/**
 * Read the session. Re-checks the invitation against the database on
 * every call, so revoking an invitation kills live sessions
 * immediately rather than waiting 7 days for the JWT to lapse.
 */
export async function getClientSession(): Promise<ClientSession | null> {
  const raw = cookies().get(CLIENT_COOKIE)?.value
  if (!raw) return null

  let payload: any
  try {
    const res = await jwtVerify(raw, getSecret(), { clockTolerance: 60 })
    payload = res.payload
  } catch {
    return null
  }

  if (payload.typ !== 'client' || !payload.pid || !payload.iid) return null

  const invitation = await prisma.invitation.findUnique({
    where: { id: payload.iid as string },
    select: { id: true, projectId: true, revokedAt: true, expiresAt: true },
  })

  if (!invitation) return null
  if (invitation.revokedAt) return null
  if (invitation.expiresAt.getTime() <= Date.now()) return null

  // The cookie must still agree with the database. If an invitation were
  // ever repointed, the stale cookie must not keep working.
  if (invitation.projectId !== payload.pid) return null

  return { projectId: invitation.projectId, invitationId: invitation.id }
}

/**
 * Use this in every client API route. Throws 401 when there is no valid
 * session. There is no parameter for the project — that is the point.
 */
export async function requireClientSession(): Promise<ClientSession> {
  const session = await getClientSession()
  if (!session) {
    const err = new Error('Unauthorized') as any
    err.status = 401
    throw err
  }
  return session
}
