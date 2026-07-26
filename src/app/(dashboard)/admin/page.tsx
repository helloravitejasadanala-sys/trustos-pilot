'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/safe-json'

type Overview = {
  cards: {
    totalWorkspaces: number
    activePilotVendors: number
    totalClients: number
    totalProjects: number
    totalVenues: number
    pendingVenueReviews: number
    verifiedVenues: number
    totalResearchContributors: number
    feedbackWaiting: number
    systemStatus: string
  }
  recentActivities: Array<{
    id: string
    event: string
    createdAt: string
    user?: { name: string | null; email: string | null } | null
    project?: { title: string; slug: string } | null
  }>
  newestVenues: Array<{
    id: string
    venueName: string
    city: string
    country: string
    contributorName: string
    status: string
    submittedAt: string
  }>
  newestPilotUsers: Array<{
    id: string
    name: string
    email: string
    createdAt: string
    vendorProfile?: { businessName: string; isActive: boolean } | null
  }>
}

const CARD_META: Array<{ key: keyof Overview['cards']; label: string; href?: string }> = [
  { key: 'activePilotVendors', label: 'Active vendors', href: '/admin/workspaces' },
  { key: 'totalWorkspaces', label: 'Workspaces', href: '/admin/workspaces' },
  { key: 'totalClients', label: 'Clients', href: '/admin/users' },
  { key: 'totalProjects', label: 'Projects' },
  { key: 'pendingVenueReviews', label: 'Venues to review', href: '/admin/venues?status=PENDING' },
  { key: 'verifiedVenues', label: 'Verified venues', href: '/admin/venues?status=VERIFIED' },
  { key: 'totalVenues', label: 'All venues', href: '/admin/venues' },
  { key: 'feedbackWaiting', label: 'Unread feedback', href: '/admin/feedback?status=UNREAD' },
  { key: 'totalResearchContributors', label: 'Contributors', href: '/admin/contributors' },
  { key: 'systemStatus', label: 'System', href: '/admin/health' },
]

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/admin/overview')
      const parsed = await parseJsonResponse<Overview & { error?: string }>(res)
      if (!parsed.ok) {
        setError(parsed.data.error || 'Could not load overview')
        setLoading(false)
        return
      }
      setData(parsed.data as Overview)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-6 w-32" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-100 bg-white p-4 text-sm text-red-700">
        {error || 'Overview unavailable'}
      </div>
    )
  }

  const nextAction =
    data.cards.pendingVenueReviews > 0
      ? { label: `Review ${data.cards.pendingVenueReviews} pending venue${data.cards.pendingVenueReviews === 1 ? '' : 's'}`, href: '/admin/venues?status=PENDING' }
      : data.cards.feedbackWaiting > 0
        ? { label: `Read ${data.cards.feedbackWaiting} unread feedback`, href: '/admin/feedback?status=UNREAD' }
        : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink-900">TrustOS HQ</h1>
        <p className="mt-1 text-sm text-ink-500">We know what matters next — pilots, venues, and feedback.</p>
      </div>

      {nextAction && (
        <Link
          href={nextAction.href}
          className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
        >
          Next: {nextAction.label} →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {CARD_META.map(card => {
          const value = data.cards[card.key]
          const display = card.key === 'systemStatus' ? String(value).toUpperCase() : value
          const inner = (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                {card.label}
              </div>
              <div className="mt-2 text-xl font-semibold tabular-nums text-ink-900">{display}</div>
            </>
          )
          return card.href ? (
            <Link
              key={card.key}
              href={card.href}
              className="rounded-xl border border-neutral-100 bg-white p-3.5 shadow-sm transition hover:border-neutral-200"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={card.key}
              className="rounded-xl border border-neutral-100 bg-white p-3.5 shadow-sm"
            >
              {inner}
            </div>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-neutral-100 bg-white p-4 lg:col-span-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Latest activity</h2>
          <ul className="mt-3 space-y-2.5">
            {data.recentActivities.length === 0 ? (
              <li className="text-sm text-ink-400">No recent activity.</li>
            ) : (
              data.recentActivities.slice(0, 8).map(a => (
                <li key={a.id} className="border-t border-neutral-50 pt-2 first:border-0 first:pt-0">
                  <div className="truncate text-[13px] font-medium text-ink-800">{a.event}</div>
                  <div className="mt-0.5 text-[11px] text-ink-400">
                    {a.project?.title ? `${a.project.title} · ` : ''}
                    {new Date(a.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-neutral-100 bg-white p-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Newest venues</h2>
            <Link href="/admin/venues" className="text-[12px] font-medium text-ink-600 hover:text-ink-900">
              View all
            </Link>
          </div>
          <ul className="mt-3 space-y-2.5">
            {data.newestVenues.length === 0 ? (
              <li className="text-sm text-ink-400">No venue submissions yet.</li>
            ) : (
              data.newestVenues.map(v => (
                <li key={v.id} className="border-t border-neutral-50 pt-2 first:border-0 first:pt-0">
                  <div className="truncate text-[13px] font-medium text-ink-800">{v.venueName}</div>
                  <div className="mt-0.5 text-[11px] text-ink-400">
                    {v.city}, {v.country} · {v.status}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-neutral-100 bg-white p-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Newest pilot users</h2>
            <Link href="/admin/users" className="text-[12px] font-medium text-ink-600 hover:text-ink-900">
              View all
            </Link>
          </div>
          <ul className="mt-3 space-y-2.5">
            {data.newestPilotUsers.length === 0 ? (
              <li className="text-sm text-ink-400">No pilot vendors yet.</li>
            ) : (
              data.newestPilotUsers.map(u => (
                <li key={u.id} className="border-t border-neutral-50 pt-2 first:border-0 first:pt-0">
                  <div className="truncate text-[13px] font-medium text-ink-800">
                    {u.vendorProfile?.businessName || u.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-400">{u.email}</div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
