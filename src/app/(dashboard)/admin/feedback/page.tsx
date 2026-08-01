'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { parseJsonResponse } from '@/lib/safe-json'

type Feedback = {
  id: string
  name: string | null
  email: string | null
  message: string
  page: string | null
  source: string
  status: 'UNREAD' | 'IN_REVIEW' | 'RESOLVED' | 'ARCHIVED'
  createdAt: string
  workspace?: { businessName: string; slug: string } | null
}

const KINDS = [
  { id: 'feedback', label: 'Feedback' },
  { id: 'demo', label: 'Demo requests' },
] as const

const FILTERS = ['ALL', 'UNREAD', 'IN_REVIEW', 'RESOLVED', 'ARCHIVED'] as const

function AdminFeedbackInner() {
  const searchParams = useSearchParams()
  const initialStatus = (searchParams.get('status') || 'ALL').toUpperCase()
  const initialKind = (searchParams.get('kind') || 'feedback').toLowerCase()
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>(
    initialKind === 'demo' ? 'demo' : 'feedback',
  )
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(
    FILTERS.includes(initialStatus as any) ? (initialStatus as any) : 'ALL',
  )
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load(nextKind: string, status: string) {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('kind', nextKind)
    if (status !== 'ALL') params.set('status', status)
    const res = await fetch(`/api/admin/feedback?${params.toString()}`)
    const parsed = await parseJsonResponse<{ feedback?: Feedback[]; error?: string }>(res)
    if (!parsed.ok) setError(parsed.data.error || 'Could not load feedback')
    else setItems(parsed.data.feedback || [])
    setLoading(false)
  }

  useEffect(() => {
    load(kind, filter)
  }, [kind, filter])

  async function setStatus(id: string, status: Feedback['status']) {
    setBusyId(id)
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const parsed = await parseJsonResponse<{ feedback?: Feedback; error?: string }>(res)
    if (parsed.ok && parsed.data.feedback) {
      setItems(list => list.map(f => (f.id === id ? { ...f, ...parsed.data.feedback! } : f)))
    }
    setBusyId(null)
  }

  const isDemo = kind === 'demo'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          {isDemo ? 'Demo requests' : 'Pilot Feedback'}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {isDemo
            ? 'People who asked to be contacted from /request-demo or Contact.'
            : 'Product and bug notes from the public feedback form.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map(k => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
              kind === k.id
                ? isDemo && k.id === 'demo'
                  ? 'bg-forest-800 text-white'
                  : 'bg-ink-900 text-white'
                : 'bg-white text-ink-600 border border-neutral-200'
            }`}
          >
            {k.label}
          </button>
        ))}
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
            {f === 'ALL' ? 'All statuses' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton h-40 rounded-xl" />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-white p-4 text-sm text-red-700">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-neutral-100 bg-white p-6 text-sm text-ink-500">
          {isDemo
            ? 'No demo requests in this view. Public form: /request-demo'
            : 'No feedback in this view. Public form: /feedback'}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(f => {
            const demo = f.source === 'request_demo'
            return (
              <li
                key={f.id}
                className={`rounded-xl border bg-white p-4 ${
                  demo ? 'border-forest-200 bg-forest-50/30' : 'border-neutral-100'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {demo ? (
                        <span className="rounded-full bg-forest-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Demo request
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-600">
                          Feedback
                        </span>
                      )}
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
                        {f.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-2 font-semibold text-ink-900">
                      {f.name || 'Anonymous'}
                      {f.email ? ` · ${f.email}` : ''}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[13.5px] text-ink-700">{f.message}</p>
                    <div className="mt-2 text-[11px] text-ink-400">
                      {new Date(f.createdAt).toLocaleString('en-GB')}
                      {f.page ? ` · ${f.page}` : ''}
                      {f.workspace ? ` · ${f.workspace.businessName}` : ''}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['UNREAD', 'IN_REVIEW', 'RESOLVED', 'ARCHIVED'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      disabled={busyId === f.id || f.status === s}
                      onClick={() => setStatus(f.id, s)}
                      className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[12px] font-medium text-ink-700 disabled:opacity-40"
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function AdminFeedbackPage() {
  return (
    <Suspense fallback={<div className="skeleton h-40 rounded-xl" />}>
      <AdminFeedbackInner />
    </Suspense>
  )
}
