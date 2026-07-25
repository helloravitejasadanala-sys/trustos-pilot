'use client'

import { useState } from 'react'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/safe-json'

export default function PublicFeedbackPage() {
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    workspaceHint: '',
    message: '',
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || undefined,
          email: form.email || undefined,
          workspaceHint: form.workspaceHint || undefined,
          message: form.message,
          page: '/feedback',
          source: 'public_form',
        }),
      })
      const parsed = await parseJsonResponse<{ error?: string }>(res)
      if (!parsed.ok) {
        setError(parsed.data.error || 'Could not submit')
        return
      }
      setDone(true)
    } catch {
      setError('Could not reach the server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-10 text-ink-900">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="text-[13px] text-ink-400 hover:text-ink-700">
          ← TrustOS
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Pilot feedback</h1>
        <p className="mt-1 text-sm text-ink-500">
          Tell TrustOS what to fix or improve. No account required.
        </p>

        {done ? (
          <div className="mt-8 rounded-xl border border-emerald-100 bg-white p-6">
            <p className="font-semibold text-ink-900">Submitted — thank you.</p>
            <p className="mt-1 text-sm text-ink-500">The TrustOS team will review it.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-xl border border-neutral-100 bg-white p-5">
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="label">Name (optional)</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Workspace (optional)</label>
              <input
                value={form.workspaceHint}
                onChange={e => setForm(f => ({ ...f, workspaceHint: e.target.value }))}
                placeholder="Business name or slug"
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="w-full"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full bg-ink-900 py-3 hover:bg-ink-800"
            >
              {submitting ? 'Submitting…' : 'Send feedback'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
