'use client'

import Link from 'next/link'
import { ArrowLeft, KeyRound, Mail } from 'lucide-react'
import { PRODUCT_BADGE, PRODUCT_NAME } from '@/lib/brand'
import { AuthCard, AuthLayout } from '@/components/layout'

/**
 * Pilot limitation: no transactional email is configured, so we cannot
 * send a reset link automatically yet. Rather than pretend, we tell the
 * vendor exactly how to get back in. This keeps the flow honest and
 * avoids a dead end.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthLayout brandName={PRODUCT_NAME} brandBadge={PRODUCT_BADGE}>
      <AuthCard className="text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-700">
          <KeyRound size={22} />
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink-900">Reset your password</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          During the pilot, password resets are handled personally so we can
          verify it&apos;s really you. Email us and we&apos;ll send you a new
          password within one business day.
        </p>

        <a
          href="mailto:support@trustos.app?subject=Password%20reset%20request"
          className="btn-primary mt-6 w-full bg-forest-800 py-3.5 hover:bg-forest-900"
        >
          <Mail size={15} className="mr-2" /> Email support
        </a>

        <Link
          href="/login"
          className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm text-ink-400 transition hover:text-forest-700"
        >
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </AuthCard>
    </AuthLayout>
  )
}
