'use client'

import { useEffect, useState } from 'react'
import { parseJsonResponse } from '@/lib/safe-json'

type Vendor = {
  id: string
  businessName: string
  slug: string
  isActive: boolean
  createdAt: string
  user: { name: string; email: string; createdAt: string }
  _count: { projects: number }
}

export default function AdminWorkspacesPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/admin/vendors')
      const parsed = await parseJsonResponse<{ vendors?: Vendor[]; error?: string }>(res)
      if (!parsed.ok) {
        setError(parsed.data.error || 'Could not load workspaces')
      } else {
        setVendors(parsed.data.vendors || [])
      }
      setLoading(false)
    })()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Workspaces</h1>
        <p className="mt-1 text-sm text-ink-500">Pilot vendor workspaces and activity.</p>
      </div>

      {loading ? (
        <div className="skeleton h-40 rounded-xl" />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-white p-4 text-sm text-red-700">{error}</div>
      ) : vendors.length === 0 ? (
        <div className="rounded-xl border border-neutral-100 bg-white p-6 text-sm text-ink-500">
          No workspaces yet. Next: wait for pilot signups.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-100 bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Workspace</th>
                <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Owner</th>
                <th className="px-4 py-2.5 font-semibold">Projects</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map(v => (
                <tr key={v.id} className="border-t border-neutral-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{v.businessName}</div>
                    <div className="text-[11px] text-ink-400">{v.slug}</div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div>{v.user.name}</div>
                    <div className="text-[11px] text-ink-400">{v.user.email}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{v._count.projects}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        v.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-ink-500'
                      }`}
                    >
                      {v.isActive ? 'Active' : 'Suspended'}
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
