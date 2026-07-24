'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowRight, Loader2, Mail, Lock, Building2, User } from 'lucide-react'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/safe-json'

export default function SignUpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: '',
    confirm: '',
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
    form.password === form.confirm

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
        }),
      })
      const { ok, data } = await parseJsonResponse<{ user?: any; error?: string }>(res)
      if (!ok) throw new Error(data.error || 'Could not create your account')
      toast.success(`Welcome to TrustOS, ${data.user?.name?.split(' ')[0] || 'there'}`)
      router.push('/vendor')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper text-ink-900">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -left-[15%] -top-[10%] h-[60vh] w-[60vh] rounded-full opacity-[0.08] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #d4b8a3 0%, transparent 70%)' }}
        />
        <div
          className="absolute -right-[5%] top-[25%] h-[45vh] w-[45vh] rounded-full opacity-[0.06] blur-[90px]"
          style={{ background: 'radial-gradient(circle, #b9d3c4 0%, transparent 70%)' }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-ink-200/40 bg-paper/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-display text-lg font-semibold tracking-tight text-forest-800">TrustOS</span>
            <span className="rounded-full border border-forest-200/60 bg-forest-50/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-forest-600">
              Pilot
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-ink-500 transition-colors hover:text-forest-700">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-73px)] items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-ink-200/40 bg-white/70 p-8 backdrop-blur-sm shadow-soft">
            <div className="text-center mb-7">
              <h1 className="font-display text-2xl font-semibold text-ink-900 tracking-tight">Create your workspace</h1>
              <p className="text-sm text-ink-400 mt-2">Set up your studio in under a minute. No card required.</p>
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
                    className="w-full pl-10 bg-white/80 border-ink-200/50 focus:border-forest-300 focus:ring-0"
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
                    className="w-full pl-10 bg-white/80 border-ink-200/50 focus:border-forest-300 focus:ring-0"
                  />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="you@studio.com"
                    required
                    className="w-full pl-10 bg-white/80 border-ink-200/50 focus:border-forest-300 focus:ring-0"
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
                    className="w-full pl-10 bg-white/80 border-ink-200/50 focus:border-forest-300 focus:ring-0"
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
                    className="w-full pl-10 bg-white/80 border-ink-200/50 focus:border-forest-300 focus:ring-0"
                  />
                </div>
                {mismatch && <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>}
              </div>

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="btn-primary w-full py-3.5 bg-forest-800 hover:bg-forest-900"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>Create workspace <ArrowRight size={14} className="ml-2" /></>}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-400">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-forest-700 hover:text-forest-900">Sign in</Link>
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-ink-300">
            Clients don&apos;t need an account — they open the secure link you send them.
          </p>
        </div>
      </main>
    </div>
  )
}
