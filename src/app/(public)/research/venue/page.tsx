'use client'

import { useState } from 'react'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/safe-json'

export default function VenueResearchFormPage() {
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    venueName: '',
    address: '',
    city: '',
    country: '',
    googleMapsUrl: '',
    contributorName: '',
    contributorEmail: '',
    workspaceHint: '',
    notes: '',
    accessNotes: '',
    typicalUse: '',
  })

  function set(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/research/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueName: form.venueName,
          address: form.address,
          city: form.city,
          country: form.country,
          googleMapsUrl: form.googleMapsUrl || undefined,
          contributorName: form.contributorName,
          contributorEmail: form.contributorEmail,
          workspaceHint: form.workspaceHint || undefined,
          source: 'public_form',
          answers: {
            notes: form.notes || undefined,
            accessNotes: form.accessNotes || undefined,
            typicalUse: form.typicalUse || undefined,
          },
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
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Venue research</h1>
        <p className="mt-1 text-sm text-ink-500">
          Submit a venue for the TrustOS research archive. No account required.
        </p>

        {done ? (
          <div className="mt-8 rounded-xl border border-emerald-100 bg-white p-6">
            <p className="font-semibold text-ink-900">Submitted — thank you.</p>
            <p className="mt-1 text-sm text-ink-500">Your venue is queued for review.</p>
            <button
              type="button"
              className="mt-4 text-sm font-semibold text-ink-700 underline"
              onClick={() => {
                setDone(false)
                setForm({
                  venueName: '',
                  address: '',
                  city: '',
                  country: '',
                  googleMapsUrl: '',
                  contributorName: '',
                  contributorEmail: '',
                  workspaceHint: '',
                  notes: '',
                  accessNotes: '',
                  typicalUse: '',
                })
              }}
            >
              Submit another
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-xl border border-neutral-100 bg-white p-5">
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {(
              [
                ['venueName', 'Venue name', true],
                ['address', 'Address', true],
                ['city', 'City', true],
                ['country', 'Country', true],
                ['googleMapsUrl', 'Google Maps link (optional)', false],
                ['contributorName', 'Your name', true],
                ['contributorEmail', 'Your email', true],
                ['workspaceHint', 'Related workspace (optional)', false],
              ] as const
            ).map(([key, label, required]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  required={required}
                  type={key === 'contributorEmail' ? 'email' : 'text'}
                  className="w-full"
                />
              </div>
            ))}
            <div>
              <label className="label">Typical use (optional)</label>
              <input value={form.typicalUse} onChange={e => set('typicalUse', e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="label">Access notes (optional)</label>
              <textarea value={form.accessNotes} onChange={e => set('accessNotes', e.target.value)} rows={2} className="w-full" />
            </div>
            <div>
              <label className="label">Other notes (optional)</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className="w-full" />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full bg-ink-900 py-3 hover:bg-ink-800"
            >
              {submitting ? 'Submitting…' : 'Submit venue'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
