import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { setSession } from '@/lib/auth'
import { clearClientSession } from '@/lib/client-session'
import { trackEvent } from '@/lib/analytics'
import { z } from 'zod'
export const dynamic = 'force-dynamic'

const registerSchema = z.object({
  businessName: z.string().trim().min(1, 'Business name is required'),
  ownerName: z.string().trim().min(1, 'Your name is required'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  primaryService: z.enum([
    'PHOTOGRAPHY',
    'LIVE_STREAMING',
    'MAKEUP_ARTIST',
    'DJ',
    'PHOTO_EDITOR',
    'VIDEO_EDITOR',
  ]),
})

/** Turn a business name into a unique, url-safe vendor slug. */
async function uniqueSlug(businessName: string): Promise<string> {
  const base =
    businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'studio'

  let slug = base
  let n = 1
  // Collisions are rare; cap the loop so a pathological case can't spin.
  while (n < 50) {
    const existing = await prisma.vendorProfile.findUnique({ where: { slug } })
    if (!existing) return slug
    n += 1
    slug = `${base}-${n}`
  }
  return `${base}-${Date.now().toString(36)}`
}

/**
 * Vendor self-service sign up. Creates the User (VENDOR) and its
 * VendorProfile (the workspace), then signs the vendor straight in.
 * Clients never register here — they arrive through a project link.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const data = registerSchema.parse(body)
    const email = data.email.toLowerCase()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try signing in.' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(data.password, 12)
    const slug = await uniqueSlug(data.businessName)

    const user = await prisma.user.create({
      data: {
        email,
        name: data.ownerName,
        password: passwordHash,
        role: 'VENDOR',
        vendorProfile: {
          create: {
            businessName: data.businessName,
            slug,
            primaryService: data.primaryService as any,
          },
        },
      },
      include: { vendorProfile: true },
    })

    await setSession(user.id, user.role)
    await clearClientSession()
    await trackEvent('user_registered', { userId: user.id, metadata: { slug } })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        vendorProfile: user.vendorProfile,
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    console.error('[REGISTER ERROR]', error)
    if (error?.message?.includes('AUTH_SECRET')) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 })
  }
}
