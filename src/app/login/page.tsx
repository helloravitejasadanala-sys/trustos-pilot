'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowRight, Loader2, Mail, Lock } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sign in failed')

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
    <div className="relative min-h-screen overflow-hidden bg-paper text-ink-900">
      {/* ===== NOISE TEXTURE OVERLAY ===== */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* ===== WARM AMBIENT ORBS ===== */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -left-[15%] -top-[10%] h-[60vh] w-[60vh] rounded-full opacity-[0.08] blur-[100px]"
          style={{ background: "radial-gradient(circle, #d4b8a3 0%, transparent 70%)" }}
        />
        <div
          className="absolute -right-[5%] top-[25%] h-[45vh] w-[45vh] rounded-full opacity-[0.06] blur-[90px]"
          style={{ background: "radial-gradient(circle, #b9d3c4 0%, transparent 70%)" }}
        />
      </div>

      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-40 border-b border-ink-200/40 bg-paper/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-display text-lg font-semibold tracking-tight text-forest-800">
              TrustOS
            </span>
            <span className="rounded-full border border-forest-200/60 bg-forest-50/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-forest-600">
              Pilot
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-ink-500 transition-colors hover:text-forest-700"
            >
              Home
            </Link>
            <Link
              href="/demo"
              className="text-sm font-medium text-ink-500 transition-colors hover:text-forest-700"
            >
              Sample journey
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-73px)] items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <div className="overflow-hidden rounded-2xl border border-ink-200/40 bg-white/70 p-8 backdrop-blur-sm shadow-soft">
            <div className="text-center mb-8">
              <h1 className="font-display text-xl font-semibold text-ink-900 tracking-tight">
                Sign in to your workspace
              </h1>
              <p className="text-sm text-ink-400 mt-2">
                For invited vendors and pilot administrators
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full pl-10 bg-white/80 border-ink-200/50 focus:border-forest-300 focus:ring-0"
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full pl-10 bg-white/80 border-ink-200/50 focus:border-forest-300 focus:ring-0"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 bg-forest-800 hover:bg-forest-900">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>
                  Sign in <ArrowRight size={14} className="ml-2" />
                </>}
              </button>
            </form>

            <div className="mt-8 space-y-3 text-center">
              <Link href="/request-demo" className="block text-sm text-ink-400 hover:text-forest-700 transition">
                Request demo access
              </Link>
              <p className="text-xs text-ink-300">
                Client with a project invitation?<br />
                Open the secure link from your vendor
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link href="/" className="text-xs text-ink-300 hover:text-ink-500 transition">
                ← Back to TrustOS
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
