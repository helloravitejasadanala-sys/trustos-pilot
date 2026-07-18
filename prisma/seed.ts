import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Seed is a setup script, not app code. Next type-checks it during the
// web build and cannot exclude it, so we run writes through a loosely
// typed handle. Runtime is identical; the columns exist via migrations.
const db = prisma as any

/**
 * Seed is deliberate and idempotent.
 *
 * - Passwords come from SEED_ADMIN_PASSWORD / SEED_VENDOR_PASSWORD.
 *   The script throws if either is missing. No credential is hardcoded.
 * - Every write uses a stable unique key, so running this repeatedly
 *   neither duplicates rows nor crashes.
 * - This must NOT run on every build. It is a one-time command:
 *       npm run db:seed
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  const isPassword = name.endsWith('PASSWORD')
  if (!value || value.trim() === '') {
    throw new Error(
      `${name} is required to seed. Refusing to seed with a default password.\n` +
      `Set it for this command only, e.g.:\n` +
      `  ${name}='<value>' npm run db:seed`
    )
  }
  if (isPassword && value.length < 12) {
    throw new Error(`${name} must be at least 12 characters.`)
  }
  if (!isPassword && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    throw new Error(`${name} must be a valid email address.`)
  }
  return value
}

async function main() {
  console.log('Seeding...')

  // Fail before touching the database if credentials are absent.
  const adminEmail = requireEnv('SEED_ADMIN_EMAIL').toLowerCase()
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD')
  const vendorEmail = requireEnv('SEED_VENDOR_EMAIL').toLowerCase()
  const vendorPassword = requireEnv('SEED_VENDOR_PASSWORD')

  const adminHash = await bcrypt.hash(adminPassword, 12)
  const vendorHash = await bcrypt.hash(vendorPassword, 12)

  // --- Admin -----------------------------------------------------
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: { password: adminHash, name: 'TrustOS Admin', role: 'ADMIN' },
    create: {
      email: adminEmail,
      password: adminHash,
      name: 'TrustOS Admin',
      role: 'ADMIN',
    },
  })
  await db.adminProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  })
  console.log(`  ${adminEmail} (ADMIN)`)

  // --- Vendor: Mini Momentz --------------------------------------
  const vendor = await db.user.upsert({
    where: { email: vendorEmail },
    update: { password: vendorHash, name: 'Ravi Sadanala', role: 'VENDOR' },
    create: {
      email: vendorEmail,
      password: vendorHash,
      name: 'Ravi Sadanala',
      role: 'VENDOR',
    },
  })

  const vendorProfile = await db.vendorProfile.upsert({
    where: { userId: vendor.id },
    update: {},
    create: {
      userId: vendor.id,
      businessName: 'Mini Momentz',
      slug: 'mini-momentz',
      tagline: 'Family photography in the UK',
      description:
        'Maternity, newborn, first birthdays and family ceremonies, photographed in Coventry and across the Midlands.',
      location: 'Coventry, UK',
      instagram: '@mini.momentz.co',
      phone: '+44 7301 014009',
      website: 'https://minimomentz.co',
    },
  })
  console.log(`  ${vendorEmail} (VENDOR)`)

  // --- Packages --------------------------------------------------
  // Unique on (vendorId, name), so re-running updates rather than duplicates.
  const packages = [
    {
      name: 'Maternity Essentials',
      price: 299.0,
      items: [{ name: '1-hour session' }, { name: '15 edited images' }, { name: 'Online gallery' }],
    },
    {
      name: 'Newborn Deluxe',
      price: 449.0,
      items: [{ name: '2-hour session' }, { name: '25 edited images' }, { name: 'Family shots' }],
    },
    {
      name: 'First Birthday',
      price: 399.0,
      items: [{ name: '1.5-hour session' }, { name: '20 edited images' }, { name: 'Themed setup' }],
    },
  ]

  for (const pkg of packages) {
    await db.package.upsert({
      where: { vendorId_name: { vendorId: vendorProfile.id, name: pkg.name } },
      update: { price: pkg.price, items: pkg.items },
      create: { vendorId: vendorProfile.id, description: '', ...pkg },
    })
  }
  console.log(`  ${packages.length} packages`)

  // --- Demo project ----------------------------------------------
  // Stable slug (no Date.now()) so the upsert key is deterministic.
  const PROJECT_SLUG = 'demo-first-birthday'

  const project = await db.project.upsert({
    where: { slug: PROJECT_SLUG },
    update: {},
    create: {
      vendorId: vendorProfile.id,
      title: 'Demo Family — First Birthday',
      slug: PROJECT_SLUG,
      status: 'PROPOSAL_SENT',
      type: 'FIRST_BIRTHDAY',
      eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      location: 'Coventry',
      budget: 500.0,
      notes: 'Seeded demo project. Not a real client.',
    },
  })

  await db.proposal.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      projectId: project.id,
      title: 'Cake Smash & First Birthday',
      description: "A relaxed session capturing your little one's first birthday.",
      price: 399.0,
      items: [
        { name: '1.5-hour session', description: 'Cake smash and family portraits' },
        { name: '20 edited images', description: 'Warm, natural editing' },
        { name: 'Themed backdrop', description: 'Chosen with you beforehand' },
      ],
      expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  })

  await db.contract.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      projectId: project.id,
      content: `PHOTOGRAPHY SERVICES AGREEMENT

1. SERVICES: Mini Momentz agrees to provide photography services as described in the accepted proposal.
2. PAYMENT: 50% deposit due on signing. Balance due 7 days before the session.
3. CANCELLATION: Cancellations within 14 days of the session forfeit the deposit.
4. DELIVERY: Edited images delivered within 21 days via online gallery.
5. COPYRIGHT: The photographer retains copyright. The client receives a personal use licence.

This is placeholder wording for the pilot and has not been reviewed by a solicitor.`,
    },
  })

  // --- Milestones ------------------------------------------------
  // Unique on (projectId, title).
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const milestoneData = [
    { title: 'Questionnaire completed', dueDate: new Date(now + 2 * day), completedAt: new Date() },
    { title: 'Proposal accepted', dueDate: new Date(now + 5 * day) },
    { title: 'Contract signed', dueDate: new Date(now + 7 * day) },
    { title: 'Photo session', dueDate: new Date(now + 30 * day) },
    { title: 'Gallery delivered', dueDate: new Date(now + 51 * day) },
  ]

  for (const m of milestoneData) {
    await db.milestone.upsert({
      where: { projectId_title: { projectId: project.id, title: m.title } },
      update: { dueDate: m.dueDate },
      create: { projectId: project.id, ...m },
    })
  }
  console.log(`  ${milestoneData.length} milestones`)

  // --- Activity log ----------------------------------------------
  // Append-only by design, so guard on existing rows rather than upsert.
  const existingLogs = await db.activityLog.count({ where: { projectId: project.id } })
  if (existingLogs === 0) {
    await db.activityLog.createMany({
      data: [
        { projectId: project.id, userId: vendor.id, event: 'project_created', metadata: { title: project.title } },
        { projectId: project.id, userId: vendor.id, event: 'proposal_sent', metadata: {} },
      ],
    })
    console.log('  2 activity log entries')
  } else {
    console.log(`  activity log already populated (${existingLogs} entries), skipped`)
  }

  // --- Second vendor: Agara Live (live-streaming) -----------------
  const agaraUser = await db.user.upsert({
    where: { email: 'suren@agaralive.co.uk' },
    update: { password: vendorHash, name: 'Suren (Agara Live)', role: 'VENDOR' },
    create: { email: 'suren@agaralive.co.uk', password: vendorHash, name: 'Suren (Agara Live)', role: 'VENDOR' },
  })
  const agara = await db.vendorProfile.upsert({
    where: { userId: agaraUser.id },
    update: {},
    create: {
      userId: agaraUser.id,
      businessName: 'Agara Live',
      slug: 'agara-live',
      tagline: 'Live streaming for events',
      location: 'London, UK',
    },
  })
  console.log('  suren@agaralive.co.uk (VENDOR - Agara Live)')

  // Helper: a bookable project with proposal + contract + invitation + milestones
  async function bookableProject(opts: {
    vendorId: string; slug: string; title: string; type: string
    proposalTitle: string; price: number; milestones: string[]
  }) {
    const project = await db.project.upsert({
      where: { slug: opts.slug },
      update: {},
      create: {
        vendorId: opts.vendorId, title: opts.title, slug: opts.slug,
        type: opts.type as any, status: 'PROPOSAL_SENT',
        eventDate: new Date(Date.now() + 30 * 86400000), location: 'UK',
      },
    })
    await db.proposal.upsert({
      where: { projectId: project.id },
      update: {},
      create: {
        projectId: project.id, title: opts.proposalTitle,
        description: 'Prepared for the pilot test flow.',
        price: opts.price, depositPercent: 50,
        items: [{ name: 'Included item A' }, { name: 'Included item B' }],
        expiryDate: new Date(Date.now() + 14 * 86400000),
      },
    })
    await db.contract.upsert({
      where: { projectId: project.id },
      update: {},
      create: {
        projectId: project.id,
        content: 'SERVICES AGREEMENT\n\n1. The vendor will provide the services in the accepted proposal.\n2. A 50% deposit is due on signing.\n3. This is placeholder pilot wording and has not been reviewed by a solicitor.',
      },
    })
    for (let i = 0; i < opts.milestones.length; i++) {
      await db.milestone.upsert({
        where: { projectId_title: { projectId: project.id, title: opts.milestones[i] } },
        update: { order: i },
        create: { projectId: project.id, title: opts.milestones[i], order: i },
      })
    }
    // one active invitation
    const existing = await db.invitation.findFirst({ where: { projectId: project.id, revokedAt: null } })
    if (!existing) {
      const { randomBytes } = await import('crypto')
      await db.invitation.create({
        data: {
          vendorId: opts.vendorId, projectId: project.id,
          token: randomBytes(32).toString('base64url'),
          expiresAt: new Date(Date.now() + 30 * 86400000),
        },
      })
    }
    return project
  }

  await bookableProject({
    vendorId: vendorProfile.id, slug: 'mm-motherhood-demo',
    title: 'Motherhood Journey (demo)', type: 'MATERNITY',
    proposalTitle: 'One-Year Motherhood Journey', price: 899,
    milestones: ['Consultation', 'Maternity session', 'Newborn session', 'Six-month session', 'First birthday', 'Final collection'],
  })
  await bookableProject({
    vendorId: agara.id, slug: 'agara-stream-demo',
    title: 'Wedding Live Stream (demo)', type: 'EVENT',
    proposalTitle: 'Two-Camera Live Stream', price: 650,
    milestones: ['Booking', 'Requirements', 'Internet check', 'Stream test', 'Live event', 'Recording delivery', 'Completion'],
  })
  console.log('  2 bookable demo projects (Mini Momentz + Agara Live)')

  console.log('\nSeed complete.')
  console.log(`  Admin:  ${adminEmail}`)
  console.log(`  Vendor: ${vendorEmail}`)
  console.log('  Passwords are the values you passed in this command.')
}

main()
  .catch(e => {
    console.error('\nSeed failed:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
