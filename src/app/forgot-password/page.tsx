'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, KeyRound, Loader2, Mail } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { PRODUCT_BADGE, PRODUCT_NAME } from '@/lib/brand'
import { AuthCard, AuthLayout } from '@/components/layout'
import { parseJsonResponse } from '@/lib/safe-json'

const SUPPORT_MAIL =
  'mailto:support@trustos.app?subject=Password%20reset%20%E2%80%94%20locked%20out&body=Hi%20TrustOS%2C%0A%0AI%20need%20a%20password%20reset.%0AWorkspace%20email%3A%20'

type Delivery = 'email' | 'manual'

/**
 * When Resend is configured, submitting emails a one-time link.
 * Otherwise a hashed token is queued for Admin → Pilot Users.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [delivery, setDelivery] = useState<Delivery>('manual')

  useEffect(() => {
    void fetch('/api/auth/forgot-password')
      .then(r => parseJsonResponse<{ delivery?: Delivery; mailEnabled?: boolean }>(r))
      .then(parsed => {
        if (!parsed.ok) return
        if (parsed.data.delivery === 'email' || parsed.data.mailEnabled) {
          setDelivery('email')
        }
      })
      .catch(() => {})
  }, [])

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
      const parsed = await parseJsonResponse<{
        message?: string
        error?: string
        delivery?: Delivery
      }>(res)
      if (!parsed.ok) throw new Error(parsed.data.error || 'Could not submit request')
      const next = parsed.data.delivery === 'email' ? 'email' : 'manual'
      setDelivery(next)
      setDone(true)
      toast.success(next === 'email' ? 'Check your email for a reset link' : 'Request saved — no email is sent automatically')
    } catch (err: any) {
      toast.error(err.message || 'Could not submit request')
    } finally {
      setLoading(false)
    }
  }

  const supportHref = `${SUPPORT_MAIL}${encodeURIComponent(email.trim())}`
  const emailMode = delivery === 'email'

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
          emailMode ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                If <strong className="text-ink-700">{email.trim()}</strong> has a workspace,
                a reset link is on its way. Check your inbox and spam folder.
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
                Request saved for <strong className="text-ink-700">{email.trim()}</strong>.
                No reset email is sent automatically — a person on the TrustOS team
                issues the link by hand.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                If you&apos;re locked out now, message us directly rather than waiting:
              </p>
              <a
                href={supportHref}
                className="btn-primary mt-5 inline-flex w-full items-center justify-center bg-forest-800 py-3.5 hover:bg-forest-900"
              >
                Email support@trustos.app
              </a>
              <Link
                href="/login"
                className="mt-4 inline-flex w-full items-center justify-center text-sm text-ink-400 transition hover:text-forest-700"
              >
                Back to sign in
              </Link>
            </>
          )
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              {emailMode
                ? 'Enter the email for your workspace. We\'ll send a one-time reset link.'
                : 'Enter the email for your workspace. We don\'t send reset emails yet — submitting queues a request for a human to issue your link.'}
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
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : emailMode ? (
                  'Email me a reset link'
                ) : (
                  'Save reset request'
                )}
              </button>
            </form>
            {!emailMode && (
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-400">
                Locked out right now?{' '}
                <a href={supportHref} className="font-medium text-forest-700 hover:text-forest-900">
                  Email support@trustos.app
                </a>
                {' '}— don&apos;t wait for an automated message that won&apos;t arrive.
              </p>
            )}
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
