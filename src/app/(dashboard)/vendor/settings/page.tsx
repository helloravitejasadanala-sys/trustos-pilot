'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2, Building2, User, Mail, Briefcase } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { parseJsonResponse } from '@/lib/safe-json'
import { PRODUCT_NAME } from '@/lib/brand'
import { PageHeader, PageLayout } from '@/components/layout'
import BackLink from '@/components/vendor/BackLink'
import { getServiceProfile, serviceOptions, type ServiceKey } from '@/lib/service-profiles'

type Me = {
  name: string
  email: string
  vendorProfile?: { businessName?: string | null; primaryService?: string | null } | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [service, setService] = useState<ServiceKey>('PHOTOGRAPHY')
  const [savingService, setSavingService] = useState(false)

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/auth/me')
      const { ok, data } = await parseJsonResponse<{ user?: Me }>(res)
      if (ok && data.user) {
        setMe(data.user)
        const ps = data.user.vendorProfile?.primaryService
        if (ps) setService(ps as ServiceKey)
      }
      setLoading(false)
    })()
  }, [])

  async function saveService(next: ServiceKey) {
    setService(next)
    setSavingService(true)
    const res = await fetch('/api/vendor/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryService: next }),
    })
    const parsed = await parseJsonResponse<{ error?: string }>(res)
    setSavingService(false)
    if (!parsed.ok) {
      toast.error(parsed.data.error || 'Could not update service')
      return
    }
    toast.success(`Primary service: ${getServiceProfile(next).label}`)
    setMe(m => m ? {
      ...m,
      vendorProfile: { ...m.vendorProfile, primaryService: next },
    } : m)
  }

  async function logout() {
    if (signingOut) return
    setSigningOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const profile = getServiceProfile(service)

  return (
    <PageLayout>
      <div className="mb-2">
        <BackLink href="/vendor" label="Today" />
      </div>
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
              <Row icon={Briefcase} label="Primary service" value={profile.label} />
            </dl>
          )}
        </section>

        <section className="rounded-xl border border-forest-100 bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-forest-500">Primary service</h2>
          <p className="mt-1 text-[13px] text-[color:var(--muted)]">
            Changes questionnaires, timeline, prep and deliverables for new work.
          </p>
          <select
            value={service}
            disabled={savingService || loading}
            onChange={e => saveService(e.target.value as ServiceKey)}
            className="mt-3 w-full"
          >
            {serviceOptions().map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <p className="mt-2 text-[12px] text-[color:var(--muted)]">{profile.description}</p>
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
