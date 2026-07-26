'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Copy, KeyRound, Loader2 } from 'lucide-react'
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

type PendingReset = {
  id: string
  userId: string
  email: string
  name: string
  role: string
  createdAt: string
  expiresAt: string
}

export default function AdminPilotUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [resets, setResets] = useState<PendingReset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [lastLink, setLastLink] = useState<{ email: string; url: string } | null>(null)

  async function load() {
    const [usersRes, resetsRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/password-resets'),
    ])
    const usersParsed = await parseJsonResponse<{ users?: UserRow[]; error?: string }>(usersRes)
    const resetsParsed = await parseJsonResponse<{ resets?: PendingReset[]; error?: string }>(resetsRes)
    if (!usersParsed.ok) setError(usersParsed.data.error || 'Could not load users')
    else setUsers(usersParsed.data.users || [])
    if (resetsParsed.ok) setResets(resetsParsed.data.resets || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const pilots = users.filter(u => u.role === 'VENDOR' || u.role === 'ADMIN')

  async function issueLink(userId: string) {
    if (busyId) return
    setBusyId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueLink: true }),
      })
      const parsed = await parseJsonResponse<{
        resetUrl?: string
        email?: string
        error?: string
      }>(res)
      if (!parsed.ok || !parsed.data.resetUrl) throw new Error(parsed.data.error || 'Failed')
      setLastLink({ email: parsed.data.email || '', url: parsed.data.resetUrl })
      toast.success('Reset link ready — copy and send to the vendor')
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Could not issue link')
    } finally {
      setBusyId(null)
    }
  }

  async function setTempPassword(userId: string, email: string) {
    if (busyId) return
    const password = window.prompt(
      `Set a temporary password for ${email}\n(min 8 characters — share it securely, then ask them to change it)`,
    )
    if (!password) return
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setBusyId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const parsed = await parseJsonResponse<{ error?: string; message?: string }>(res)
      if (!parsed.ok) throw new Error(parsed.data.error || 'Failed')
      toast.success('Temporary password set — tell the vendor securely')
    } catch (e: any) {
      toast.error(e.message || 'Could not set password')
    } finally {
      setBusyId(null)
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Reset link copied')
    } catch {
      toast.error('Could not copy — select the link manually')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Pilot Users</h1>
        <p className="mt-1 text-sm text-ink-500">
          Vendors and admins. Issue a one-time password reset link when someone is locked out.
        </p>
      </div>

      {lastLink && (
        <div className="rounded-xl border border-forest-100 bg-white p-4 text-sm">
          <div className="font-semibold text-ink-900">Latest reset link for {lastLink.email}</div>
          <p className="mt-1 break-all text-[12.5px] text-ink-500">{lastLink.url}</p>
          <button
            type="button"
            className="btn btn-forest mt-3"
            style={{ minHeight: 36 }}
            onClick={() => copyLink(lastLink.url)}
          >
            <Copy size={14} className="mr-1.5" /> Copy link
          </button>
        </div>
      )}

      {resets.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
          <div className="text-[13px] font-semibold text-ink-900">
            {resets.length} pending password reset {resets.length === 1 ? 'request' : 'requests'}
          </div>
          <ul className="mt-2 space-y-2">
            {resets.slice(0, 8).map(r => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <span>
                  <strong>{r.name}</strong> · {r.email}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: 32, fontSize: 12 }}
                  disabled={busyId === r.userId}
                  onClick={() => issueLink(r.userId)}
                >
                  {busyId === r.userId ? <Loader2 size={14} className="animate-spin" /> : 'Copy fresh link'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                <th className="px-4 py-2.5 font-semibold">Recovery</th>
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
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest-700 hover:text-forest-900"
                        disabled={busyId === u.id}
                        onClick={() => issueLink(u.id)}
                      >
                        {busyId === u.id ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                        Link
                      </button>
                      <button
                        type="button"
                        className="text-[12px] font-semibold text-ink-500 hover:text-ink-800"
                        disabled={busyId === u.id}
                        onClick={() => setTempPassword(u.id, u.email)}
                      >
                        Set password
                      </button>
                    </div>
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
