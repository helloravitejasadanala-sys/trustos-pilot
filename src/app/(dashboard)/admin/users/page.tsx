'use client'

import { useEffect, useState } from 'react'
import { parseJsonResponse } from '@/lib/safe-json'

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  vendorProfile?: { businessName: string; isActive: boolean } | null
  _count?: { projects: number }
}

export default function AdminPilotUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/admin/users')
      const parsed = await parseJsonResponse<{ users?: UserRow[]; error?: string }>(res)
      if (!parsed.ok) setError(parsed.data.error || 'Could not load users')
      else setUsers(parsed.data.users || [])
      setLoading(false)
    })()
  }, [])

  const pilots = users.filter(u => u.role === 'VENDOR' || u.role === 'CLIENT')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Pilot Users</h1>
        <p className="mt-1 text-sm text-ink-500">Vendors and clients on the pilot.</p>
      </div>

      {loading ? (
        <div className="skeleton h-40 rounded-xl" />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-white p-4 text-sm text-red-700">{error}</div>
      ) : pilots.length === 0 ? (
        <div className="rounded-xl border border-neutral-100 bg-white p-6 text-sm text-ink-500">
          No pilot users yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-100 bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Name</th>
                <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Email</th>
                <th className="px-4 py-2.5 font-semibold">Role</th>
                <th className="px-4 py-2.5 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {pilots.map(u => (
                <tr key={u.id} className="border-t border-neutral-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">
                      {u.vendorProfile?.businessName || u.name}
                    </div>
                    <div className="text-[11px] text-ink-400 sm:hidden">{u.email}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-600 sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-500">
                    {new Date(u.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
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
