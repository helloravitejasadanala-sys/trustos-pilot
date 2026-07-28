'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Calendar, Mail, Phone, Plus } from 'lucide-react'
import BackLink from '@/components/vendor/BackLink'
import { StatusChip, CardSkeleton } from '@/components/ui'
import { PageLayout } from '@/components/layout'
import { useVendorChrome } from '@/components/vendor/VendorShell'
import { parseJsonResponse } from '@/lib/safe-json'
import { projectTypeLabel } from '@/lib/project-types'
import { getNextAction } from '@/lib/journey'
import { vendorProjectHref } from '@/lib/vendor-workspace'

type ClientProject = {
  id: string
  title: string
  slug: string
  status: string
  eventDate: string | null
  location?: string | null
  service?: string | null
  type?: string | null
}

type ClientDetail = {
  id: string
  name: string
  email: string
  phone?: string | null
  archived: boolean
  projects: ClientProject[]
}

function continueHref(p: ClientProject): string {
  // Money-heavy states open Money; otherwise Overview (has the next CTA).
  if (
    p.status === 'CONTRACT_SIGNED' ||
    p.status === 'DEPOSIT_PAID' ||
    p.status === 'FULLY_PAID'
  ) {
    return vendorProjectHref(p.slug, 'Money')
  }
  return vendorProjectHref(p.slug)
}

export default function ClientOverviewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { openNewProject } = useVendorChrome()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setState('loading')
      try {
        const res = await fetch(`/api/vendor/clients/${params.id}`)
        const { ok, data } = await parseJsonResponse<{ client?: ClientDetail; error?: string }>(res)
        if (cancelled) return
        if (!ok || !data.client) {
          setState('error')
          return
        }
        setClient(data.client)
        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params.id])

  const primaryBooking = useMemo(() => {
    if (!client?.projects.length) return null
    const open = client.projects.find(
      p => p.status !== 'CANCELLED' && p.status !== 'COMPLETED',
    )
    return open || client.projects[0]
  }, [client])

  function startBooking() {
    if (!client) return
    openNewProject({
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
    })
  }

  if (state === 'loading') {
    return (
      <PageLayout>
        <BackLink href="/vendor/clients" label="Clients" />
        <div className="mt-4 space-y-2.5">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </PageLayout>
    )
  }

  if (state === 'error' || !client) {
    return (
      <PageLayout>
        <BackLink href="/vendor/clients" label="Clients" />
        <div className="mt-6 rounded-xl border border-forest-100 bg-white px-5 py-8 text-center">
          <p className="text-[15px] font-semibold text-forest-950">Client not found</p>
          <p className="mt-1 text-[13px] text-[color:var(--muted)]">
            They may have been removed, or this link is out of date.
          </p>
          <button type="button" className="btn btn-forest mt-4" onClick={() => router.push('/vendor/clients')}>
            Back to clients
          </button>
        </div>
      </PageLayout>
    )
  }

  const firstName = client.name.split(' ')[0] || 'them'

  return (
    <PageLayout>
      <div className="mb-4">
        <BackLink href="/vendor/clients" label="Clients" />
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="serif break-words" style={{ fontSize: 28, lineHeight: 1.1, margin: 0 }}>
            {client.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[color:var(--muted)]">
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <Mail size={13} aria-hidden className="shrink-0" />
              <span className="truncate">{client.email}</span>
            </span>
            {client.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone size={13} aria-hidden />
                {client.phone}
              </span>
            )}
            {client.archived && <span className="chip chip-muted">Archived</span>}
          </div>
        </div>
        <button type="button" className="btn btn-forest shrink-0 min-h-[44px]" onClick={startBooking}>
          <Plus size={16} className="mr-1.5" />
          New booking
        </button>
      </div>

      {client.projects.length === 0 ? (
        <div className="rounded-xl border border-forest-100 bg-white px-5 py-8 text-center">
          <p className="text-[14.5px] font-semibold text-forest-950">No bookings yet</p>
          <p className="mt-1 text-[13px] text-[color:var(--muted)]">
            Create a booking for {firstName} and share one secure link — never a dead end.
          </p>
          <button type="button" className="btn btn-forest mt-4 min-h-[44px]" onClick={startBooking}>
            ＋ Create booking
          </button>
        </div>
      ) : (
        <>
          {primaryBooking && (
            <div className="mb-5 rounded-xl border border-forest-100 bg-white p-4 sm:p-5">
              <div className="kicker mb-2">Continue with {firstName}</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[16px] font-bold text-forest-950">{primaryBooking.title}</span>
                <StatusChip status={primaryBooking.status} />
              </div>
              <p className="mt-1.5 text-[13.5px] text-[color:var(--muted)]">
                Next: {getNextAction(primaryBooking.status, primaryBooking.service).nextAction}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={continueHref(primaryBooking)}
                  className="btn btn-forest min-h-[44px] justify-center text-center"
                  style={{ textDecoration: 'none' }}
                >
                  Open booking →
                </Link>
                <button
                  type="button"
                  className="btn-secondary min-h-[44px]"
                  onClick={startBooking}
                >
                  ＋ Another booking
                </button>
              </div>
            </div>
          )}

          <div className="kicker mb-2.5">
            {client.projects.length === 1 ? 'Booking' : 'All bookings'}
          </div>
          <div className="divide-y divide-forest-100 overflow-hidden rounded-xl border border-forest-100 bg-white">
            {client.projects.map(p => {
              const na = getNextAction(p.status, p.service)
              return (
                <Link
                  key={p.id}
                  href={continueHref(p)}
                  className="flex min-h-[64px] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-forest-50/50"
                  style={{ color: 'var(--ink)', textDecoration: 'none' }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-bold">{p.title}</span>
                      <StatusChip status={p.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-[color:var(--muted)]">
                      {p.type && <span>{projectTypeLabel(p.type)}</span>}
                      {p.eventDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} aria-hidden />
                          {new Date(p.eventDate).toLocaleDateString('en-GB')}
                        </span>
                      )}
                      {p.location && <span className="truncate">{p.location}</span>}
                    </div>
                    <p className="mt-1 text-[12.5px] text-forest-800">
                      Next: {na.nextAction}
                    </p>
                  </div>
                  <span className="shrink-0 text-[14px] font-semibold text-forest-700">Open →</span>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </PageLayout>
  )
}
