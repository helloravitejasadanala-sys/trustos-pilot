'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowRight, Loader2, Mail, Lock } from 'lucide-react'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/safe-json'
import { PRODUCT_BADGE, PRODUCT_NAME } from '@/lib/brand'
import { AuthCard, AuthLayout } from '@/components/layout'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember }),
      })

      const { ok, data } = await parseJsonResponse<{ user?: any; error?: string }>(res)
      if (!ok) {
        const message = data.error || "That email or password didn't match"
        setError(message)
        toast.error(message)
        return
      }

      toast.success(`Welcome back${data.user.name ? `, ${String(data.user.name).split(' ')[0]}` : ''} — here’s what needs you today`)

      // STEP 4 — a CLIENT must never be redirected to /vendor.
      // Clients do not use this login; they arrive by invitation link.
      if (data.user.role === 'ADMIN') router.push('/admin')
      else if (data.user.role === 'VENDOR') router.push('/vendor')
      else {
        const message = 'Clients should open the secure link from your vendor.'
        setError(message)
        toast.error(message)
        await fetch('/api/auth/logout', { method: 'POST' })
        return
      }

      router.refresh()
    } catch (err: any) {
      const message = err.message || "That email or password didn't match"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      brandName={PRODUCT_NAME}
      brandBadge={PRODUCT_BADGE}
      nav={[{ href: '/signup', label: 'Create workspace' }]}
    >
      <AuthCard>
        <div className="mb-8 text-center">
          <h1 className="font-display text-xl font-semibold tracking-tight text-ink-900">
            Sign in to your workspace
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            Photographers, livestream, makeup &amp; DJs — and TrustOS HQ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? 'login-error' : undefined}>
          {error ? (
            <div id="login-error" role="alert" className="banner banner-error">
              {error}
            </div>
          ) : null}
          <div className="relative">
            <Mail
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[color:var(--faint)]"
            />
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); if (error) setError('') }}
              placeholder="Email"
              required
              autoComplete="email"
              className="auth-input-with-icon w-full border-[color:var(--line)] bg-[color:var(--panel)] focus:border-[color:var(--forest)]"
            />
          </div>
          <div className="relative">
            <Lock
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[color:var(--faint)]"
            />
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); if (error) setError('') }}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="auth-input-with-icon w-full border-[color:var(--line)] bg-[color:var(--panel)] focus:border-[color:var(--forest)]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-[color:var(--muted)]">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-[color:var(--line)] text-forest-700 focus:ring-0 accent-[color:var(--forest)]"
                style={{ minHeight: 'auto' }}
              />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-sm font-medium text-forest-700 hover:text-forest-900">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full bg-forest-800 py-3.5 hover:bg-forest-900">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <>
              Sign in <ArrowRight size={14} className="ml-2" />
            </>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
          New to {PRODUCT_NAME}?{' '}
          <Link href="/signup" className="font-medium text-forest-700 hover:text-forest-900">Create your workspace</Link>
        </p>

        <div className="mt-6 space-y-3 border-t border-[color:var(--line-soft)] pt-6 text-center">
          <p className="text-[13px] text-[color:var(--muted)]">
            Client with a project invitation?<br />
            Open the secure link from your vendor
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-[13px] text-[color:var(--muted)] transition hover:text-[color:var(--ink)]">
            ← Back to {PRODUCT_NAME}
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
