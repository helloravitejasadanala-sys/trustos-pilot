'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, KeyRound, Loader2, Lock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { PRODUCT_BADGE, PRODUCT_NAME } from '@/lib/brand'
import { AuthCard, AuthLayout } from '@/components/layout'
import { parseJsonResponse } from '@/lib/safe-json'

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const tooShort = password.length > 0 && password.length < 8
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = !!token && password.length >= 8 && password === confirm && !loading

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const parsed = await parseJsonResponse<{ error?: string }>(res)
      if (!parsed.ok) throw new Error(parsed.data.error || 'Could not reset password')
      toast.success('Password updated — sign in with your new password')
      router.push('/login')
    } catch (err: any) {
      toast.error(err.message || 'Could not reset password')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <>
        <p className="mt-3 text-sm text-ink-500">
          This reset link is missing or incomplete. Request a new one from the sign-in page.
        </p>
        <Link href="/forgot-password" className="btn-primary mt-6 inline-flex w-full justify-center bg-forest-800 py-3.5">
          Request a new link
        </Link>
      </>
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 text-left">
      <div>
        <label className="label">New password</label>
        <div className="relative">
          <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[color:var(--faint)]" />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="auth-input-with-icon w-full border-ink-200/50 bg-white/80 focus:border-forest-300 focus:ring-0"
          />
        </div>
        {tooShort && <p className="mt-1 text-xs text-red-600">Use at least 8 characters</p>}
      </div>
      <div>
        <label className="label">Confirm password</label>
        <div className="relative">
          <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[color:var(--faint)]" />
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Re-enter your password"
            className="auth-input-with-icon w-full border-ink-200/50 bg-white/80 focus:border-forest-300 focus:ring-0"
          />
        </div>
        {mismatch && <p className="mt-1 text-xs text-red-600">Passwords do not match</p>}
      </div>
      <button type="submit" disabled={!canSubmit} className="btn-primary w-full bg-forest-800 py-3.5 hover:bg-forest-900">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <>Set new password <ArrowRight size={14} className="ml-2" /></>}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout brandName={PRODUCT_NAME} brandBadge={PRODUCT_BADGE}>
      <AuthCard className="text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-700">
          <KeyRound size={22} />
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink-900">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-ink-400">Then sign in to your workspace.</p>
        <Suspense fallback={<div className="mt-6 h-24 animate-pulse rounded-lg bg-neutral-100" />}>
          <ResetForm />
        </Suspense>
        <Link href="/login" className="mt-5 inline-block text-sm text-ink-400 hover:text-forest-700">
          Back to sign in
        </Link>
      </AuthCard>
    </AuthLayout>
  )
}
