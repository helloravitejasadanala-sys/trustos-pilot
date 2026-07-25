'use client'

import { useEffect, useState } from 'react'
import { parseJsonResponse } from '@/lib/safe-json'

type Health = {
  systemStatus: string
  checkedAt: string
  checks: {
    database: string
    authSecret: boolean
    databaseUrl: boolean
    appUrl: boolean
    stripe: boolean
  }
}

export default function AdminHealthPage() {
  const [data, setData] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/health')
    const parsed = await parseJsonResponse<Health & { error?: string }>(res)
    if (!parsed.ok) setError(parsed.data.error || 'Health check failed')
    else {
      setData(parsed.data as Health)
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">System Health</h1>
          <p className="mt-1 text-sm text-ink-500">Operational checks — no secrets shown.</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-700"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="skeleton h-40 rounded-xl" />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-white p-4 text-sm text-red-700">{error}</div>
      ) : data ? (
        <div className="space-y-3">
          <div
            className={`rounded-xl border p-4 ${
              data.systemStatus === 'ok'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-900'
                : 'border-amber-100 bg-amber-50 text-amber-900'
            }`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">System status</div>
            <div className="mt-1 text-xl font-semibold uppercase">{data.systemStatus}</div>
            <div className="mt-1 text-[12px] opacity-70">
              Checked {new Date(data.checkedAt).toLocaleString('en-GB')}
            </div>
          </div>

          <ul className="overflow-hidden rounded-xl border border-neutral-100 bg-white divide-y divide-neutral-50">
            {(
              [
                ['Database', data.checks.database === 'ok' ? 'OK' : 'Error'],
                ['AUTH_SECRET configured', data.checks.authSecret ? 'Yes' : 'Missing'],
                ['DATABASE_URL configured', data.checks.databaseUrl ? 'Yes' : 'Missing'],
                ['App URL configured', data.checks.appUrl ? 'Yes' : 'Missing'],
                ['Stripe configured', data.checks.stripe ? 'Yes' : 'Not set'],
              ] as const
            ).map(([label, value]) => (
              <li key={label} className="flex items-center justify-between px-4 py-3 text-[13px]">
                <span className="text-ink-600">{label}</span>
                <span className="font-semibold text-ink-900">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
