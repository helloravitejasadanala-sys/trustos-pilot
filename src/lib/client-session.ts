import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from './prisma'

/**
 * STAGE 2 — secure client access.
 *
 * Clients never authenticate with a password. They arrive by an
 * invitation link, /p/[token]. That token is exchanged for an
 * httpOnly session cookie (authenticator) AND must be presented again
 * on every /api/client/* call as X-TrustOS-Invitation (selector).
 *
 *   Cookie  = you opened a valid portal link (authenticated client).
 *   Header  = which invitation/project THIS tab is acting on.
 *
 * Project id is NEVER taken from the client body/query. It comes from
 * the validated invitation token in the header. That way two tabs with
 * the same cookie jar still isolate to their own tokens.
 */

const CLIENT_COOKIE = 'trustos_client'
/** Tab must send the URL invitation token on every client API call. */
export const CLIENT_INVITATION_HEADER = 'x-trustos-invitation'
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
  // Older rows could theoretically lack a project — never mint a session for those.
  if (!invitation.projectId) return { ok: false, reason: 'not_found' }
  if (invitation.revokedAt) return { ok: false, reason: 'revoked' }
  if (invitation.expiresAt.getTime() <= Date.now()) return { ok: false, reason: 'expired' }

  return { ok: true, invitationId: invitation.id, projectId: invitation.projectId }
}

const clientCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_MAX_AGE_S,
  path: '/',
}

async function signClientSessionToken(invitationId: string, projectId: string) {
  return new SignJWT({ pid: projectId, iid: invitationId, typ: 'client' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

/**
 * Issue the scoped session. The cookie authenticates the browser as a
 * client who exchanged a valid invite. Per-call X-TrustOS-Invitation
 * selects which project to serve.
 */
export async function createClientSession(
  invitationId: string,
  projectId: string,
  res?: NextResponse,
) {
  const token = await signClientSessionToken(invitationId, projectId)

  if (res) {
    res.cookies.set(CLIENT_COOKIE, token, clientCookieOptions)
  } else {
    cookies().set(CLIENT_COOKIE, token, clientCookieOptions)
  }
}

export async function clearClientSession() {
  cookies().set(CLIENT_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export type ClientSession = { projectId: string; invitationId: string }

/**
 * Read the authenticator cookie. Re-checks the invitation against the
 * database so revoking kills live sessions immediately.
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

function invitationTokenFromRequest(req: NextRequest): string | null {
  const h = req.headers.get(CLIENT_INVITATION_HEADER)?.trim()
  if (h && h.length >= 20) return h
  return null
}

/**
 * Authenticator (cookie) + selector (invitation header).
 * Project ALWAYS comes from the validated header token — never from a
 * client-supplied projectId, and never from the cookie alone (so two
 * tabs sharing one cookie jar stay isolated).
 */
export async function requireClientSession(req: NextRequest): Promise<ClientSession> {
  const session = await getClientSession()
  if (!session) {
    const err = new Error('Unauthorized') as any
    err.status = 401
    throw err
  }

  const inviteToken = invitationTokenFromRequest(req)
  if (!inviteToken) {
    const err = new Error('Missing invitation identity for this tab.') as any
    err.status = 403
    throw err
  }

  const check = await validateInvitationToken(inviteToken)
  if (!check.ok) {
    const err = new Error('This invitation is not valid for this request.') as any
    err.status = 403
    throw err
  }

  // Selector wins: return the project unlocked by THIS tab's token.
  return { projectId: check.projectId, invitationId: check.invitationId }
}
