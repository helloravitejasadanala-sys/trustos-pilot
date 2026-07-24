import { prisma } from './prisma'
import { generateInvitationToken } from './client-session'
import { DEMO, type DemoKey } from './demo'

const INVITATION_TTL_DAYS = 30
const DEMO_TTL_DAYS = 3650

export function appUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

type InvitationRow = {
  token: string
  expiresAt: Date
  openedAt: Date | null
  email: string | null
}

export function formatInvitationLink(inv: InvitationRow) {
  return {
    url: `${appUrl()}/p/${inv.token}`,
    expiresAt: inv.expiresAt,
    openedAt: inv.openedAt,
    email: inv.email,
    expired: inv.expiresAt.getTime() <= Date.now(),
  }
}

/** Ensure a project has a valid, non-revoked invitation. Creates one if missing. */
export async function ensureActiveInvitation(
  vendorId: string,
  projectId: string,
  opts?: { email?: string | null; fixedToken?: string }
): Promise<InvitationRow> {
  const existing = await prisma.invitation.findFirst({
    where: {
      projectId,
      vendorId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: { token: true, expiresAt: true, openedAt: true, email: true },
  })

  if (existing) return existing

  return prisma.invitation.create({
    data: {
      vendorId,
      projectId,
      email: opts?.email ?? null,
      token: opts?.fixedToken ?? generateInvitationToken(),
      expiresAt: new Date(
        Date.now() + (opts?.fixedToken ? DEMO_TTL_DAYS : INVITATION_TTL_DAYS) * 86400000
      ),
    },
    select: { token: true, expiresAt: true, openedAt: true, email: true },
  })
}

/** Restore the deterministic demo invitation token for a seeded demo project. */
export async function ensureDemoInvitation(key: DemoKey): Promise<InvitationRow | null> {
  const config = DEMO[key]
  const project = await prisma.project.findFirst({
    where: { slug: config.projectSlug },
    select: { id: true, vendorId: true },
  })
  if (!project) return null

  // Revoke stale invitations that use a different token
  await prisma.invitation.updateMany({
    where: {
      projectId: project.id,
      token: { not: config.demoToken },
      revokedAt: null,
    },
    data: { revokedAt: new Date(), status: 'EXPIRED' },
  })

  return prisma.invitation.upsert({
    where: { token: config.demoToken },
    update: {
      projectId: project.id,
      vendorId: project.vendorId,
      expiresAt: new Date(Date.now() + DEMO_TTL_DAYS * 86400000),
      revokedAt: null,
      openedAt: null,
      status: 'PENDING',
    },
    create: {
      vendorId: project.vendorId,
      projectId: project.id,
      token: config.demoToken,
      expiresAt: new Date(Date.now() + DEMO_TTL_DAYS * 86400000),
    },
    select: { token: true, expiresAt: true, openedAt: true, email: true },
  })
}
