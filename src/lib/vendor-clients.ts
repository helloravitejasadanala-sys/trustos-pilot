import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export type ResolvedClient = {
  id: string
  name: string
  email: string
  phone: string | null
  avatar: string | null
  createdAt: Date
}

/**
 * Attach or create a CLIENT user for a vendor.
 * - Blocks using the vendor's own email (or any VENDOR/ADMIN email).
 * - Reuses existing CLIENT emails without claiming a brand-new row.
 * - Does not overwrite name/phone when the client is only linked to other vendors.
 */
export async function resolveOrCreateClient(opts: {
  vendorId: string
  vendorUserId: string
  vendorEmail: string
  name?: string
  email: string
  phone?: string | null
}): Promise<{ client: ResolvedClient; created: boolean; reused: boolean }> {
  const email = opts.email.trim().toLowerCase()
  if (!email) throw Object.assign(new Error('Client email is required'), { status: 400 })

  if (email === opts.vendorEmail.trim().toLowerCase()) {
    throw Object.assign(
      new Error("Use your client's email — not your own workspace email."),
      { status: 409 },
    )
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
  })

  if (existing && existing.role !== 'CLIENT') {
    throw Object.assign(
      new Error('That email already belongs to another TrustOS account. Use a different email for the client.'),
      { status: 409 },
    )
  }

  if (existing) {
    const linkedHere = await prisma.project.findFirst({
      where: { vendorId: opts.vendorId, clientId: existing.id },
      select: { id: true },
    })
    const orphanHere = await vendorOwnsOrphanClient(opts.vendorUserId, existing.id)
    const invitedHere = await vendorKnowsClientEmail(opts.vendorId, email)

    if (linkedHere || orphanHere || invitedHere) {
      const client = await prisma.user.update({
        where: { id: existing.id },
        data: {
          ...(opts.name?.trim() ? { name: opts.name.trim() } : {}),
          ...(opts.phone !== undefined ? { phone: opts.phone || null } : {}),
          role: 'CLIENT',
        },
        select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
      })
      return { client, created: false, reused: true }
    }

    // Shared global CLIENT user — attach by id, do not overwrite their profile.
    return {
      client: {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        avatar: existing.avatar,
        createdAt: existing.createdAt,
      },
      created: false,
      reused: true,
    }
  }

  const client = await prisma.user.create({
    data: {
      email,
      name: opts.name?.trim() || email.split('@')[0],
      phone: opts.phone || null,
      role: 'CLIENT',
      password: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
    },
    select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
  })
  return { client, created: true, reused: false }
}

export async function vendorOwnsOrphanClient(vendorUserId: string, clientId: string) {
  const logs = await prisma.activityLog.findMany({
    where: { userId: vendorUserId, event: 'client_directory_added' },
    select: { metadata: true },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })
  return logs.some(l => (l.metadata as { clientId?: string } | null)?.clientId === clientId)
}

/** True when this vendor invited or booked this client email (soft ownership). */
export async function vendorKnowsClientEmail(vendorId: string, email: string) {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false
  const hit = await prisma.invitation.findFirst({
    where: { vendorId, email: normalized },
    select: { id: true },
  })
  return !!hit
}

/** Project-linked, invite-linked, or directory-orphan client owned by this vendor. */
export async function resolveVendorClient(clientId: string, vendorUserId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } })
  if (!vendor) throw Object.assign(new Error('Vendor profile not found'), { status: 404 })

  const linked = await prisma.project.findFirst({
    where: { vendorId: vendor.id, clientId },
    include: { client: true },
  })
  if (linked?.client) return { vendor, client: linked.client }

  const orphan = await prisma.user.findFirst({
    where: { id: clientId, role: 'CLIENT' },
  })
  if (!orphan) throw Object.assign(new Error('Client not found'), { status: 404 })

  if (await vendorOwnsOrphanClient(vendorUserId, clientId)) {
    return { vendor, client: orphan }
  }
  if (await vendorKnowsClientEmail(vendor.id, orphan.email)) {
    return { vendor, client: orphan }
  }

  throw Object.assign(new Error('Client not found'), { status: 404 })
}

/** Record directory ownership so orphan clients remain editable after create. */
export async function noteClientDirectory(vendorUserId: string, clientId: string, email: string, reused: boolean) {
  await prisma.activityLog.create({
    data: {
      userId: vendorUserId,
      event: 'client_directory_added',
      metadata: { clientId, email, reused },
    },
  })
}
