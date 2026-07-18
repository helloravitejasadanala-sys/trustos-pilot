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
        toast.error('Clients should open the secure link from their vendor.')
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
    <div className="min-h-screen flex items-center justify-center bg-white px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-xl font-semibold text-ink-900 tracking-tight">
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
              className="w-full pl-10"
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
              className="w-full pl-10"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <>
              Sign in <ArrowRight size={14} className="ml-2" />
            </>}
          </button>
        </form>

        <div className="mt-8 space-y-3 text-center">
          <Link href="/request-demo" className="block text-sm text-ink-400 hover:text-ink-700 transition">
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
  )
}
