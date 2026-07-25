'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { parseJsonResponse } from '@/lib/safe-json'

type Venue = {
  id: string
  venueName: string
  address: string
  city: string
  country: string
  googleMapsUrl: string | null
  contributorName: string
  contributorEmail: string
  source: string
  status: 'PENDING' | 'VERIFIED' | 'ARCHIVED'
  submittedAt: string
  answers: Record<string, unknown>
  workspace?: { businessName: string; slug: string } | null
}

const FILTERS = ['ALL', 'PENDING', 'VERIFIED', 'ARCHIVED'] as const

function AdminVenuesInner() {
  const searchParams = useSearchParams()
  const initial = (searchParams.get('status') || 'ALL').toUpperCase()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(
    FILTERS.includes(initial as any) ? (initial as any) : 'ALL',
  )
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load(status: string) {
    setLoading(true)
    setError(null)
    const qs = status === 'ALL' ? '' : `?status=${status}`
    const res = await fetch(`/api/admin/venues${qs}`)
    const parsed = await parseJsonResponse<{ venues?: Venue[]; error?: string }>(res)
    if (!parsed.ok) setError(parsed.data.error || 'Could not load venues')
    else setVenues(parsed.data.venues || [])
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  async function setStatus(id: string, status: Venue['status']) {
    setBusyId(id)
    const res = await fetch(`/api/admin/venues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const parsed = await parseJsonResponse<{ venue?: Venue; error?: string }>(res)
    if (parsed.ok && parsed.data.venue) {
      setVenues(list => list.map(v => (v.id === id ? { ...v, ...parsed.data.venue! } : v)))
    }
    setBusyId(null)
  }

  const pendingCount = venues.filter(v => v.status === 'PENDING').length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Venue Research</h1>
        <p className="mt-1 text-sm text-ink-500">
          {filter === 'PENDING' || pendingCount > 0
            ? 'Next: verify pending submissions.'
            : 'Review and archive venue research.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
              filter === f ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 border border-neutral-200'
            }`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton h-40 rounded-xl" />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-white p-4 text-sm text-red-700">{error}</div>
      ) : venues.length === 0 ? (
        <div className="rounded-xl border border-neutral-100 bg-white p-6 text-sm text-ink-500">
          No venues in this view. Public form: /research/venue
        </div>
      ) : (
        <ul className="space-y-3">
          {venues.map(v => (
            <li key={v.id} className="rounded-xl border border-neutral-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-ink-900">{v.venueName}</div>
                  {v.source === 'venue_experience' ? (
                    <div className="mt-1 space-y-0.5 text-[13px] text-ink-600">
                      <div>
                        {v.city}
                        {v.country ? `, ${v.country}` : ''}
                      </div>
                      {v.answers?.contributor_role != null && (
                        <div>Role: {String(v.answers.contributor_role)}</div>
                      )}
                      {Array.isArray(v.answers?.issues) ? (
                        <div>Issues: {(v.answers.issues as unknown[]).map(String).join(', ')}</div>
                      ) : v.answers?.primary_challenge != null ? (
                        <div>Issue: {String(v.answers.primary_challenge)}</div>
                      ) : null}
                      {v.answers?.advice_for_next_professional != null && (
                        <div className="italic text-ink-500">
                          “{String(v.answers.advice_for_next_professional)}”
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-0.5 text-[13px] text-ink-500">
                      {v.address} · {v.city}, {v.country}
                    </div>
                  )}
                  <div className="mt-1 text-[12px] text-ink-400">
                    {v.source === 'venue_experience'
                      ? 'Anonymous experience'
                      : `${v.contributorName} · ${v.contributorEmail}`}
                    {' · '}{v.source}
                    {v.workspace ? ` · ${v.workspace.businessName}` : ''}
                  </div>
                  <div className="mt-1 text-[11px] tabular-nums text-ink-400">
                    {new Date(v.submittedAt).toLocaleString('en-GB')} · ID {v.id.slice(0, 8)}
                  </div>
                  {v.googleMapsUrl && (
                    <a
                      href={v.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-[12px] font-medium text-ink-700 underline"
                    >
                      Google Maps
                    </a>
                  )}
                </div>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
                  {v.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['PENDING', 'VERIFIED', 'ARCHIVED'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    disabled={busyId === v.id || v.status === s}
                    onClick={() => setStatus(v.id, s)}
                    className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[12px] font-medium text-ink-700 disabled:opacity-40"
                  >
                    Mark {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function AdminVenuesPage() {
  return (
    <Suspense fallback={<div className="skeleton h-40 rounded-xl" />}>
      <AdminVenuesInner />
    </Suspense>
  )
}
