'use client'

import { useState } from 'react'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/safe-json'

export default function RequestDemoPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [business, setBusiness] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          workspaceHint: business.trim() || undefined,
          message: `Demo request for “${business.trim()}”.`,
          page: '/request-demo',
          source: 'request_demo',
        }),
      })
      const parsed = await parseJsonResponse<{ error?: string }>(res)
      if (!parsed.ok) {
        setError(parsed.data.error || 'Could not save your request.')
        return
      }
      setDone(true)
      setEmail('')
      setName('')
      setBusiness('')
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-sm mx-auto px-5 py-10">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-ink-600 transition mb-8">
          <ArrowLeft size={14} />
          Back
        </Link>

        <h1 className="text-xl font-semibold text-ink-900 tracking-tight mb-2">Request a demo</h1>
        <p className="text-sm text-ink-400 mb-8 leading-relaxed">
          Tell us who you are — we review every request personally.
        </p>

        {done ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5">
            <p className="font-semibold text-ink-900">Saved</p>
            <p className="mt-1.5 text-sm text-ink-600 leading-relaxed">
              We review every request personally and will get back to you.
            </p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-forest-700 hover:text-forest-900">
              Back to TrustOS
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <div>
              <label className="label">Your name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ravi Kumar" required className="w-full" />
            </div>
            <div>
              <label className="label">Business name</label>
              <input value={business} onChange={e => setBusiness(e.target.value)} placeholder="e.g. Mini Momentz" required className="w-full" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.com" required className="w-full" />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5 mt-2">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <>
                Request demo <Send size={14} className="ml-2" />
              </>}
            </button>
          </form>
        )}

        <p className="text-xs text-ink-300 mt-6 text-center">
          Invitation only. Your request is stored for the TrustOS team to review.
        </p>
      </div>
    </div>
  )
}
