'use client'

import { useEffect, useState } from 'react'
import { parseJsonResponse } from '@/lib/safe-json'

type Contributor = {
  contributorName: string
  email: string
  totalSubmissions: number
  verifiedPercent: number
  lastContribution: string
  status: string
}

export default function AdminContributorsPage() {
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/admin/contributors')
      const parsed = await parseJsonResponse<{ contributors?: Contributor[]; error?: string }>(res)
      if (!parsed.ok) setError(parsed.data.error || 'Could not load contributors')
      else setContributors(parsed.data.contributors || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Research Contributors</h1>
        <p className="mt-1 text-sm text-ink-500">Leaderboard from venue research submissions.</p>
      </div>

      {loading ? (
        <div className="skeleton h-40 rounded-xl" />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-white p-4 text-sm text-red-700">{error}</div>
      ) : contributors.length === 0 ? (
        <div className="rounded-xl border border-neutral-100 bg-white p-6 text-sm text-ink-500">
          No contributors yet. Next: share /research/venue with the pilot community.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-100 bg-white">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Contributor</th>
                <th className="px-4 py-2.5 font-semibold">Email</th>
                <th className="px-4 py-2.5 font-semibold">Submissions</th>
                <th className="px-4 py-2.5 font-semibold">Verified %</th>
                <th className="px-4 py-2.5 font-semibold">Last contribution</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {contributors.map(c => (
                <tr key={c.email} className="border-t border-neutral-50">
                  <td className="px-4 py-3 font-medium text-ink-900">{c.contributorName}</td>
                  <td className="px-4 py-3 text-ink-600">{c.email}</td>
                  <td className="px-4 py-3 tabular-nums">{c.totalSubmissions}</td>
                  <td className="px-4 py-3 tabular-nums">{c.verifiedPercent}%</td>
                  <td className="px-4 py-3 text-ink-500">
                    {new Date(c.lastContribution).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
