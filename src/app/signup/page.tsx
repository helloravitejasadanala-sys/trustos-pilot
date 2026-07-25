'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowRight, Loader2, Mail, Lock, Building2, User } from 'lucide-react'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/safe-json'
import { PRODUCT_BADGE, PRODUCT_NAME } from '@/lib/brand'
import { AuthCard, AuthLayout } from '@/components/layout'
import { serviceOptions, type ServiceKey } from '@/lib/service-profiles'

export default function SignUpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: '',
    confirm: '',
    primaryService: 'PHOTOGRAPHY' as ServiceKey,
  })

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const passwordTooShort = form.password.length > 0 && form.password.length < 8
  const mismatch = form.confirm.length > 0 && form.password !== form.confirm
  const canSubmit =
    form.businessName.trim() &&
    form.ownerName.trim() &&
    form.email.trim() &&
    form.password.length >= 8 &&
    form.password === form.confirm &&
    !!form.primaryService

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          ownerName: form.ownerName.trim(),
          email: form.email.trim(),
          password: form.password,
          primaryService: form.primaryService,
        }),
      })
      const { ok, data } = await parseJsonResponse<{ user?: any; error?: string }>(res)
      if (!ok) throw new Error(data.error || 'Could not create your account')
      toast.success(`Welcome to ${PRODUCT_NAME}, ${data.user?.name?.split(' ')[0] || 'there'}`)
      router.push('/vendor')
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
      maxWidth="md"
      nav={[{ href: '/login', label: 'Sign in' }]}
    >
      <AuthCard>
        <div className="mb-7 text-center px-0.5">
          <h1 className="font-display text-[1.35rem] font-semibold tracking-tight text-ink-900 break-words sm:text-2xl">
            Create your workspace
          </h1>
          <p className="mt-2 text-sm text-ink-400">Set up your workspace in under a minute. No card required.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Business name</label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                value={form.businessName}
                onChange={e => set('businessName', e.target.value)}
                placeholder="e.g. Mini Momentz"
                required
                autoFocus
                className="auth-input-with-icon w-full border-ink-200/50 bg-white/80 focus:border-forest-300 focus:ring-0"
              />
            </div>
          </div>

          <div>
            <label className="label">Your name</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                value={form.ownerName}
                onChange={e => set('ownerName', e.target.value)}
                placeholder="e.g. Ravi Sadanala"
                required
                className="auth-input-with-icon w-full border-ink-200/50 bg-white/80 focus:border-forest-300 focus:ring-0"
              />
            </div>
          </div>

          <div>
            <label className="label">Primary service</label>
            <select
              value={form.primaryService}
              onChange={e => set('primaryService', e.target.value as ServiceKey)}
              required
              className="w-full border-ink-200/50 bg-white/80 focus:border-forest-300 focus:ring-0"
            >
              {serviceOptions().map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-400">
              {serviceOptions().find(s => s.value === form.primaryService)?.description}
            </p>
          </div>

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="you@business.com"
                required
                className="auth-input-with-icon w-full border-ink-200/50 bg-white/80 focus:border-forest-300 focus:ring-0"
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                type="password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="At least 8 characters"
                required
                className="auth-input-with-icon w-full border-ink-200/50 bg-white/80 focus:border-forest-300 focus:ring-0"
              />
            </div>
            {passwordTooShort && <p className="mt-1 text-xs text-red-600">Use at least 8 characters.</p>}
          </div>

          <div>
            <label className="label">Confirm password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                type="password"
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                placeholder="Re-enter your password"
                required
                className="auth-input-with-icon w-full border-ink-200/50 bg-white/80 focus:border-forest-300 focus:ring-0"
              />
            </div>
            {mismatch && <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>}
          </div>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="btn-primary w-full bg-forest-800 py-3.5 hover:bg-forest-900"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <>Create workspace <ArrowRight size={14} className="ml-2" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-forest-700 hover:text-forest-900">Sign in</Link>
        </p>
      </AuthCard>

      <p className="mt-4 text-center text-xs text-ink-300">
        Clients don&apos;t need an account — they open the secure link you send them.
      </p>
    </AuthLayout>
  )
}
