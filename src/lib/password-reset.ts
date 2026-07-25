import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { appUrl } from '@/lib/invitations'

const TTL_MS = 1000 * 60 * 60 * 24 // 24 hours

export function hashResetToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}

/** Create a one-time reset token. Returns the raw token (show once) and shareable URL. */
export async function issuePasswordReset(userId: string) {
  const raw = randomBytes(32).toString('base64url')
  const tokenHash = hashResetToken(raw)
  const expiresAt = new Date(Date.now() + TTL_MS)

  // Invalidate prior unused tokens for this user.
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  })

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  })

  return {
    raw,
    expiresAt,
    url: `${appUrl()}/reset-password?token=${encodeURIComponent(raw)}`,
  }
}

export async function consumePasswordReset(raw: string) {
  const tokenHash = hashResetToken(raw)
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, role: true } } },
  })
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw Object.assign(new Error('This reset link is invalid or has expired.'), { status: 400 })
  }
  if (row.user.role === 'CLIENT') {
    throw Object.assign(
      new Error('Clients sign in via their secure project link, not a password.'),
      { status: 400 },
    )
  }
  return row
}
