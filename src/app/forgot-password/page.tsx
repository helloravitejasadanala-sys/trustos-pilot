'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, KeyRound, Loader2, Mail } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { PRODUCT_BADGE, PRODUCT_NAME } from '@/lib/brand'
import { AuthCard, AuthLayout } from '@/components/layout'
import { parseJsonResponse } from '@/lib/safe-json'

/**
 * Pilot: no transactional email yet. Submitting an email creates a hashed
 * reset token; TrustOS support copies the one-time link from Admin and
 * sends it to the vendor within one business day.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const parsed = await parseJsonResponse<{ message?: string; error?: string }>(res)
      if (!parsed.ok) throw new Error(parsed.data.error || 'Could not submit request')
      setDone(true)
      toast.success('Request received')
    } catch (err: any) {
      toast.error(err.message || 'Could not submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout brandName={PRODUCT_NAME} brandBadge={PRODUCT_BADGE}>
      <AuthCard className="text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-700">
          <KeyRound size={22} />
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink-900">
          Reset your password
        </h1>

        {done ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              If <strong>{email.trim()}</strong> has a workspace, TrustOS support will email
              you a one-time reset link within one business day (check spam). Your request is
              already queued for the team.
            </p>
            <Link
              href="/login"
              className="btn-primary mt-6 inline-flex w-full items-center justify-center bg-forest-800 py-3.5 hover:bg-forest-900"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              Enter the email you used for your workspace. During the pilot, resets are
              handled personally so we can verify it&apos;s you — usually within one business day.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4 text-left">
              <div>
                <label className="label">Workspace email</label>
                <div className="relative">
                  <Mail
                    size={16}
                    aria-hidden
                    className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[color:var(--faint)]"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@business.com"
                    className="auth-input-with-icon w-full border-ink-200/50 bg-white/80 focus:border-forest-300 focus:ring-0"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary w-full bg-forest-800 py-3.5 hover:bg-forest-900"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Request reset link'}
              </button>
            </form>
            <p className="mt-4 text-[12.5px] text-ink-400">
              Or email{' '}
              <a href="mailto:support@trustos.app?subject=Password%20reset%20request" className="font-medium text-forest-700">
                support@trustos.app
              </a>
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm text-ink-400 transition hover:text-forest-700"
            >
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </>
        )}
      </AuthCard>
    </AuthLayout>
  )
}
