'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { parseJsonResponse } from '@/lib/safe-json'
import { PRODUCT_NAME } from '@/lib/brand'

type Me = {
  name: string
  email: string
  role: string
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/auth/me')
      const parsed = await parseJsonResponse<{ user?: Me }>(res)
      if (parsed.ok && parsed.data.user) setMe(parsed.data.user)
      setLoading(false)
    })()
  }, [])

  async function logout() {
    if (signingOut) return
    setSigningOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-ink-500">{PRODUCT_NAME} company access.</p>
      </div>

      <section className="rounded-xl border border-neutral-100 bg-white">
        <h2 className="border-b border-neutral-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          Admin account
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-ink-400" />
          </div>
        ) : (
          <dl className="divide-y divide-neutral-50 text-[13px]">
            <div className="flex justify-between gap-3 px-4 py-3">
              <dt className="text-ink-400">Name</dt>
              <dd className="font-medium text-ink-900">{me?.name || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 px-4 py-3">
              <dt className="text-ink-400">Email</dt>
              <dd className="font-medium text-ink-900">{me?.email || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 px-4 py-3">
              <dt className="text-ink-400">Role</dt>
              <dd className="font-medium text-ink-900">{me?.role || '—'}</dd>
            </div>
          </dl>
        )}
      </section>

      <button
        type="button"
        onClick={logout}
        disabled={signingOut}
        className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] font-semibold text-ink-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        {signingOut ? (
          <Loader2 size={15} className="mr-2 animate-spin" />
        ) : (
          <LogOut size={15} className="mr-2" />
        )}
        Sign out
      </button>
    </div>
  )
}
