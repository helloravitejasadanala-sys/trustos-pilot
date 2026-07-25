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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember }),
      })

      const { ok, data } = await parseJsonResponse<{ user?: any; error?: string }>(res)
      if (!ok) throw new Error(data.error || 'Sign in failed')

      toast.success(`Welcome, ${data.user.name}`)

      // STEP 4 — a CLIENT must never be redirected to /vendor.
      // Clients do not use this login; they arrive by invitation link.
      if (data.user.role === 'ADMIN') router.push('/admin')
      else if (data.user.role === 'VENDOR') router.push('/vendor')
      else {
        toast.error('Clients should open the secure link from your vendor.')
        await fetch('/api/auth/logout', { method: 'POST' })
        return
      }

      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      brandName={PRODUCT_NAME}
      brandBadge={PRODUCT_BADGE}
      nav={[
        { href: '/', label: 'Home' },
        { href: '/demo', label: 'Sample journey' },
      ]}
    >
      <AuthCard>
        <div className="mb-8 text-center">
          <h1 className="font-display text-xl font-semibold tracking-tight text-ink-900">
            Sign in to your workspace
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            For invited vendors and pilot administrators
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Email"
              required
              className="w-full border-[color:var(--line)] bg-[color:var(--panel)] focus:border-[color:var(--forest)]"
              style={{ paddingLeft: 44 }}
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
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full border-[color:var(--line)] bg-[color:var(--panel)] focus:border-[color:var(--forest)]"
              style={{ paddingLeft: 44 }}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink-500">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-forest-700 focus:ring-0"
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

        <p className="mt-6 text-center text-sm text-ink-400">
          New to {PRODUCT_NAME}?{' '}
          <Link href="/signup" className="font-medium text-forest-700 hover:text-forest-900">Create your workspace</Link>
        </p>

        <div className="mt-6 space-y-3 border-t border-ink-200/40 pt-6 text-center">
          <p className="text-xs text-ink-300">
            Client with a project invitation?<br />
            Open the secure link from your vendor
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-ink-300 transition hover:text-ink-500">
            ← Back to {PRODUCT_NAME}
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
