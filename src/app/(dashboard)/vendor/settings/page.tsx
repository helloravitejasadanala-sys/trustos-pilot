'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2, Building2, User, Mail } from 'lucide-react'
import { parseJsonResponse } from '@/lib/safe-json'
import { PRODUCT_NAME } from '@/lib/brand'
import { PageHeader, PageLayout } from '@/components/layout'

type Me = {
  name: string
  email: string
  vendorProfile?: { businessName?: string | null } | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/auth/me')
      const { ok, data } = await parseJsonResponse<{ user?: Me }>(res)
      if (ok && data.user) setMe(data.user)
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
    <PageLayout>
      <PageHeader
        title="Settings"
        description={
          me?.vendorProfile?.businessName
            ? `${me.vendorProfile.businessName} on ${PRODUCT_NAME}`
            : 'Your account and workspace'
        }
      />

      <div className="max-w-lg space-y-4">
        <section className="rounded-xl border border-forest-100 bg-white">
          <h2 className="border-b border-forest-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-forest-500">Your workspace</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-forest-400" /></div>
          ) : (
            <dl className="divide-y divide-forest-50">
              <Row icon={Building2} label="Workspace" value={me?.vendorProfile?.businessName || '—'} />
              <Row icon={User} label="Owner" value={me?.name || '—'} />
              <Row icon={Mail} label="Email" value={me?.email || '—'} />
            </dl>
          )}
        </section>

        <button onClick={logout} disabled={signingOut} className="btn-secondary w-full sm:w-auto">
          {signingOut ? <Loader2 size={16} className="mr-2 animate-spin" /> : <LogOut size={16} className="mr-2" />}Sign out
        </button>
      </div>
    </PageLayout>
  )
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon size={16} className="shrink-0 text-forest-400" />
      <div className="min-w-0">
        <p className="text-[11px] text-forest-400">{label}</p>
        <p className="text-[13px] font-medium text-forest-900 truncate">{value}</p>
      </div>
    </div>
  )
}
