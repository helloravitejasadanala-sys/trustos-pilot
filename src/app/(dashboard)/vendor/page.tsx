'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getNextAction } from '@/lib/journey'
import { isArchivedProject, type VendorProject } from '@/lib/vendor-phase1'
import { hasUnread } from '@/lib/unread'
import { parseJsonResponse } from '@/lib/safe-json'
import { projectTypeLabel } from '@/lib/project-types'
import { useVendorChrome } from '@/components/vendor/VendorShell'

const VENDOR_PRIORITY = [
  'QUESTIONNAIRE_COMPLETED',
  'PROPOSAL_ACCEPTED',
  'LEAD',
  'DEPOSIT_PAID',
  'FULLY_PAID',
  'COMPLETED',
]

const CTA_LABEL: Record<string, string> = {
  LEAD: 'Share invitation →',
  QUESTIONNAIRE_COMPLETED: 'Review details →',
  PROPOSAL_ACCEPTED: 'Send agreement →',
  DEPOSIT_PAID: 'Start delivery →',
  FULLY_PAID: 'Finish delivery →',
  COMPLETED: 'Request review →',
}

const ACTION_HEADLINE: Record<string, (client: string) => string> = {
  LEAD: (c) => `Share ${c} their invitation`,
  QUESTIONNAIRE_COMPLETED: (c) => `Review ${c}'s details`,
  PROPOSAL_ACCEPTED: (c) => `Send ${c} the agreement`,
  DEPOSIT_PAID: (c) => `Start delivery for ${c}`,
  FULLY_PAID: (c) => `Finish delivery for ${c}`,
  COMPLETED: (c) => `Ask ${c} for a review`,
}

const ACTION_WHY: Record<string, string> = {
  LEAD: 'They need the link before they can confirm details.',
  QUESTIONNAIRE_COMPLETED: 'Details are in — review them, then send a quote.',
  PROPOSAL_ACCEPTED: 'Quote accepted. Send the agreement so they can pay.',
  DEPOSIT_PAID: 'Payment received. Deliver the work.',
  FULLY_PAID: 'Balance settled. Finish delivery for approval.',
  COMPLETED: 'Job complete. Ask for a review.',
}

type ActivityItem = { id: string; event: string; createdAt: string; project: { title: string; slug: string } | null }

function greetingFor(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function markerClass(type: string | null) {
  const t = (type || '').toUpperCase()
  if (t.includes('STREAM') || t === 'LIVE_STREAM') return 'marker marker-stream'
  if (t === 'COMPLETED' || t === 'CANCELLED') return 'marker marker-done'
  return 'marker marker-photo'
}

function markerLetter(type: string | null, title: string) {
  const t = (type || '').toUpperCase()
  if (t.includes('STREAM') || t === 'LIVE_STREAM') return 'S'
  if (t.includes('VIDEO')) return 'V'
  if (t.includes('WEDDING') || t.includes('PHOTO') || t.includes('FAMILY') || t.includes('PORTRAIT')) return 'P'
  return (title || 'P').charAt(0).toUpperCase()
}

export default function TodayPage() {
  const { openNewProject, userName, businessName, primaryService, profileLoaded } = useVendorChrome()
  const [projects, setProjects] = useState<VendorProject[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [business, setBusiness] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function load() {
    setLoadError(null)
    try {
      const [res, actRes, meRes] = await Promise.all([
        fetch('/api/vendor/projects'),
        fetch('/api/vendor/activity'),
        fetch('/api/auth/me'),
      ])
      if (res.status === 401 || meRes.status === 401) {
        setLoadError('Your session expired. Please sign in again.')
        return
      }
      if (res.status === 403) {
        setLoadError('This workspace is suspended. Contact support if you need access restored.')
        return
      }
      const { ok, data } = await parseJsonResponse<{ projects?: VendorProject[]; error?: string }>(res)
      if (!ok) {
        setLoadError(data.error || 'Could not load your projects. Please refresh and try again.')
        return
      }
      setProjects((data.projects || []).filter((p: VendorProject) => !isArchivedProject(p)))
      const act = await parseJsonResponse<{ activity?: ActivityItem[] }>(actRes)
      if (act.ok) setActivity(act.data.activity || [])
      const me = await parseJsonResponse<{ user?: { name?: string; vendorProfile?: { businessName?: string } } }>(meRes)
      if (me.ok) {
        setBusiness(me.data.user?.vendorProfile?.businessName || '')
        setOwnerName(me.data.user?.name || '')
      }
    } catch {
      setLoadError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const servicesSoon = useMemo(() => {
    return projects
      .filter(p => p.eventDate && (p.eventDate.startsWith(todayStr) || p.eventDate.startsWith(tomorrowStr)))
      .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime())
  }, [projects, todayStr, tomorrowStr])

  const waitingVendor = projects.filter(p => getNextAction(p.status, primaryService).responsible === 'Vendor')
  const waitingClient = projects.filter(p => getNextAction(p.status, primaryService).responsible === 'Client')

  const vendorActionable = waitingVendor
    .map(p => ({ p, na: getNextAction(p.status, primaryService) }))
    .sort((a, b) => {
      const ai = VENDOR_PRIORITY.indexOf(a.p.status)
      const bi = VENDOR_PRIORITY.indexOf(b.p.status)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  const todaysAction = vendorActionable[0] ?? null

  const deadlines = useMemo(() => {
    return projects
      .filter(p => p.eventDate && new Date(p.eventDate) >= new Date())
      .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime())
      .slice(0, 5)
  }, [projects])

  const unreadProjects = projects.filter(p => hasUnread(p.id, p.lastClientMessageAt))
  const firstName = (ownerName || userName).split(' ')[0] || ''
  const workspaceName = business || businessName
  const greeting = greetingFor(new Date().getHours())
  const greetingLine = firstName ? `${greeting}, ${firstName}` : greeting
  const avatarLetter = firstName ? firstName.charAt(0).toUpperCase() : (workspaceName ? workspaceName.charAt(0).toUpperCase() : '')

  if (loading || !profileLoaded) {
    return (
      <div>
        <div className="skeleton mb-3 h-8 w-56" />
        <div className="skeleton mb-6 h-4 w-72" />
        <div className="action">
          <div className="skeleton mb-3 h-4 w-28" style={{ background: 'rgba(255,255,255,.08)' }} />
          <div className="skeleton mb-2 h-6 w-3/4" style={{ background: 'rgba(255,255,255,.1)' }} />
          <div className="skeleton h-4 w-1/2" style={{ background: 'rgba(255,255,255,.08)' }} />
        </div>
        <div className="panel mt-5 p-4">
          <div className="skeleton mb-3 h-3 w-1/3" />
          <div className="skeleton mb-2 h-10 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div>
        <div className="banner banner-error mb-5" role="alert">
          ⚠ {loadError}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-forest" onClick={() => { setLoading(true); load() }}>
            Try again
          </button>
          <Link href="/login" className="btn btn-ghost">Sign in again</Link>
        </div>
      </div>
    )
  }

  // Empty workspace — one clear next action
  if (projects.length === 0) {
    return (
      <div>
        <h1 className="serif" style={{ fontSize: 32, lineHeight: 1 }}>
          Welcome{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 mb-6 text-[color:var(--muted)]">
          Your workspace is ready.
        </p>
        <div className="action" style={{ maxWidth: 620 }}>
          <div className="kicker mb-2.5 text-[color:var(--lime)]">Do this first</div>
          <div style={{ font: 'var(--t-h1)', marginBottom: 6 }}>Create your first project</div>
          <p className="mb-5 max-w-[48ch] text-[13.5px] text-[color:var(--on-dark-mut)]">
            Add a client and job type. They get a secure link to confirm details.
          </p>
          <button type="button" className="btn btn-lime" onClick={openNewProject}>
            ＋ New project
          </button>
        </div>
      </div>
    )
  }

  const clientLabel = todaysAction?.p.client?.name?.split(' ')[0]
    || todaysAction?.p.title
    || 'your client'
  const headline = todaysAction
    ? (ACTION_HEADLINE[todaysAction.p.status]?.(clientLabel)
      ?? todaysAction.na.nextAction)
    : ''
  const why = todaysAction
    ? (ACTION_WHY[todaysAction.p.status] ?? todaysAction.na.nextAction)
    : ''
  const cta = todaysAction
    ? (CTA_LABEL[todaysAction.p.status] ?? 'Open project →')
    : ''

  const eventDate = todaysAction?.p.eventDate ? new Date(todaysAction.p.eventDate) : null

  return (
    <div>
      {/* Mobile compact greeting */}
      <div className="vendor-mobile-head mb-3">
        <div>
          <div className="num text-[12px] text-[color:var(--muted)]">
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
          <h1 className="serif" style={{ fontSize: 26, lineHeight: 1.05 }}>
            {greetingLine}
          </h1>
        </div>
        <span
          className="marker"
          style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--forest)', color: '#fff' }}
          aria-hidden
        >
          {avatarLetter || '·'}
        </span>
      </div>

      {/* Desktop greeting */}
      <div className="mb-5 hidden md:block">
        <h1 className="serif" style={{ fontSize: 32, lineHeight: 1 }}>
          {greetingLine}
        </h1>
        <p className="mt-1 text-[color:var(--muted)]">
          {waitingVendor.length > 0
            ? `${waitingVendor.length} waiting on you${waitingClient.length > 0 ? ` · ${waitingClient.length} waiting on clients` : ''}${unreadProjects.length > 0 ? ` · ${unreadProjects.length} unread` : ''}`
            : waitingClient.length > 0
              ? `${waitingClient.length} waiting on clients${unreadProjects.length > 0 ? ` · ${unreadProjects.length} unread` : ''}`
              : unreadProjects.length > 0
                ? `${unreadProjects.length} unread message${unreadProjects.length === 1 ? '' : 's'}`
                : 'Nothing needs you right now'}
        </p>
      </div>

      {unreadProjects.length > 0 && (
        <div
          className="banner mb-4"
          role="status"
          style={{
            borderColor: 'color-mix(in srgb, var(--coral-deep, #c45c3e) 40%, var(--line))',
            background: 'color-mix(in srgb, var(--coral-soft, #f5e4dc) 55%, var(--panel))',
          }}
        >
          <span aria-hidden>✉</span>
          <div className="min-w-0 flex-1">
            <strong style={{ color: 'var(--coral-deep, #c45c3e)' }}>
              {unreadProjects.length} unread {unreadProjects.length === 1 ? 'message' : 'messages'}
            </strong>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {unreadProjects.slice(0, 3).map(p => (
                <Link
                  key={p.id}
                  href={`/vendor/projects/${p.slug}`}
                  className="font-semibold underline underline-offset-2"
                  style={{ color: 'var(--forest)' }}
                >
                  Reply to {p.client?.name || p.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="today-grid">
        <div className="today-stack">
          {/* Do This First — exactly one dark .action + one lime CTA */}
          {todaysAction ? (
            <div>
              <div className="kicker mb-2.5 text-[color:var(--coral-deep)]">● Do this first</div>
              <div className="action">
                <div className="flex gap-3 md:gap-5">
                  {eventDate && !isNaN(eventDate.getTime()) && (
                    <div className="today-date-block">
                      <span className="kicker text-[color:var(--lime)]">
                        {eventDate.toLocaleDateString('en-GB', { weekday: 'short' })}
                      </span>
                      <div>
                        <div className="num text-[22px] font-extrabold leading-none md:text-[30px]">
                          {eventDate.getDate()}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[color:var(--on-dark-mut)]">
                          {eventDate.toLocaleDateString('en-GB', { month: 'short' })}
                          {eventDate.getHours() || eventDate.getMinutes()
                            ? ` · ${eventDate.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}`
                            : ''}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2.5 flex flex-wrap items-center gap-2">
                      <span
                        className={markerClass(todaysAction.p.type)}
                        style={{ width: 26, height: 26, fontSize: 12 }}
                        aria-hidden
                      >
                        {markerLetter(todaysAction.p.type, todaysAction.p.title)}
                      </span>
                      <span className="text-[13px] font-semibold">
                        {todaysAction.p.client?.name || 'Client'} · {projectTypeLabel(todaysAction.p.type || 'OTHER')}
                      </span>
                      {todaysAction.p.status === 'QUESTIONNAIRE_COMPLETED' && (
                        <span className="chip chip-coral">Just in</span>
                      )}
                    </div>
                    <div style={{ font: 'var(--t-h1)', marginBottom: 6 }}>{headline}</div>
                    <p className="m-0 max-w-[46ch] text-[13px] text-[color:var(--on-dark-mut)]">{why}</p>
                  </div>
                </div>
                <div className="mt-4 md:mt-5">
                  <Link
                    href={`/vendor/projects/${todaysAction.p.slug}`}
                    className="btn btn-lime w-full md:w-auto"
                  >
                    {cta}
                  </Link>
                </div>
              </div>
            </div>
          ) : unreadProjects.length > 0 ? (
            <div className="action">
              <div className="kicker mb-2.5 text-[color:var(--lime)]">Do this first</div>
              <div style={{ font: 'var(--t-h1)', marginBottom: 6 }}>
                Read unread messages
              </div>
              <p className="m-0 mb-5 max-w-[46ch] text-[13.5px] text-[color:var(--on-dark-mut)]">
                {unreadProjects[0].client?.name || unreadProjects[0].title} is waiting for a reply.
              </p>
              <Link
                href={`/vendor/projects/${unreadProjects[0].slug}`}
                className="btn btn-lime w-full md:w-auto"
              >
                Open messages →
              </Link>
            </div>
          ) : (
            <div className="action">
              <div className="kicker mb-2.5 text-[color:var(--on-dark-mut)]">Do this first</div>
              <div style={{ font: 'var(--t-h1)', marginBottom: 6 }}>You&apos;re all caught up</div>
              <p className="m-0 max-w-[46ch] text-[13.5px] text-[color:var(--on-dark-mut)]">
                Active projects are waiting on clients.
              </p>
            </div>
          )}

          {servicesSoon.length > 0 && (
            <div>
              <div className="mb-2.5 flex items-baseline justify-between">
                <h2 style={{ font: 'var(--t-h2)', margin: 0 }}>Coming up</h2>
                <span className="text-[12px] text-[color:var(--muted)]">
                  {servicesSoon.length}
                </span>
              </div>
              <div className="panel overflow-hidden">
                {servicesSoon.map(p => {
                  const d = new Date(p.eventDate!)
                  const na = getNextAction(p.status, primaryService)
                  const chip =
                    na.responsible === 'Vendor' ? 'chip chip-amber' :
                    na.responsible === 'Client' ? 'chip chip-lav' : 'chip chip-muted'
                  const chipLabel =
                    na.responsible === 'Vendor' ? 'Your turn' :
                    na.responsible === 'Client' ? 'Waiting' : 'Done'
                  return (
                    <Link key={p.id} href={`/vendor/projects/${p.slug}`} className="today-service-row">
                      <div className="w-10 shrink-0 text-center md:w-11">
                        <div className="num text-[14px] font-extrabold text-[color:var(--forest)] md:text-[16px]">
                          {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                        </div>
                        <div className="num text-[10px] text-[color:var(--muted)] md:text-[11px]">
                          {d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                      <span
                        className={markerClass(p.type)}
                        style={{ width: 34, height: 34, fontSize: 13 }}
                        aria-hidden
                      >
                        {markerLetter(p.type, p.title)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold md:text-[14.5px]">{p.title}</div>
                        <div className="truncate text-[11.5px] text-[color:var(--muted)] md:text-[12.5px]">
                          {p.location || p.client?.name || projectTypeLabel(p.type || 'OTHER')}
                        </div>
                      </div>
                      <span className={chip}>{chipLabel}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mobile count tiles */}
          <div className="today-count-tiles">
            <div className="panel" style={{ padding: 15, borderLeft: '3px solid var(--amber)' }}>
              <div className="num text-[26px] font-extrabold text-[color:var(--amber)]">{waitingVendor.length}</div>
              <div className="mt-1 text-[12.5px] font-semibold">Waiting on me</div>
            </div>
            <div className="panel" style={{ padding: 15, borderLeft: '3px solid var(--lav)' }}>
              <div className="num text-[26px] font-extrabold text-[color:var(--lav)]">{waitingClient.length}</div>
              <div className="mt-1 text-[12.5px] font-semibold">Waiting on client</div>
            </div>
          </div>

          {/* Desktop: Waiting on me list */}
          <div className="hidden md:block">
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 style={{ font: 'var(--t-h2)', margin: 0 }}>Waiting on me</h2>
              <span className="num text-[12px] text-[color:var(--muted)]">{waitingVendor.length}</span>
            </div>
            <div className="panel overflow-hidden" style={{ borderLeft: '3px solid var(--amber)' }}>
              {waitingVendor.length === 0 ? (
                <p className="px-4 py-4 text-[13px] text-[color:var(--muted)]">Nothing needs your action right now.</p>
              ) : (
                waitingVendor.slice(0, 4).map(p => (
                  <Link key={p.id} href={`/vendor/projects/${p.slug}`} className="today-service-row">
                    <span className={markerClass(p.type)} style={{ width: 32, height: 32, fontSize: 12 }} aria-hidden>
                      {markerLetter(p.type, p.title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold">{p.title}</div>
                      <div className="truncate text-[12px] text-[color:var(--muted)]">
                        {CTA_LABEL[p.status]?.replace(' →', '') || getNextAction(p.status, primaryService).nextAction}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Context rail */}
        <div className="today-stack hidden gap-4 md:flex" style={{ gap: 16 }}>
          <div className="context" style={{ padding: 18 }}>
            <div className="mb-3 flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--lav)' }} aria-hidden />
              <div style={{ font: 'var(--t-xs)', fontWeight: 700 }}>Waiting on client</div>
              <span className="num ml-auto text-[12px] text-[color:var(--muted)]">{waitingClient.length}</span>
            </div>
            {waitingClient.length === 0 ? (
              <p className="text-[12.5px] text-[color:var(--muted)]">No clients are blocking progress.</p>
            ) : (
              waitingClient.slice(0, 3).map(p => (
                <div key={p.id} className="panel mb-2.5 last:mb-0" style={{ padding: 13, boxShadow: 'none' }}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={markerClass(p.type)} style={{ width: 22, height: 22, fontSize: 11 }} aria-hidden>
                      {markerLetter(p.type, p.title)}
                    </span>
                    <span className="truncate text-[13px] font-semibold">{p.client?.name || p.title}</span>
                  </div>
                  <div className="mb-2.5 text-[12px] text-[color:var(--muted)]">
                    {getNextAction(p.status, primaryService).nextAction}
                  </div>
                  <Link
                    href={`/vendor/projects/${p.slug}`}
                    className="text-[12.5px] font-semibold text-[color:var(--lav)] underline-offset-2 hover:underline"
                  >
                    Open project →
                  </Link>
                </div>
              ))
            )}
          </div>

          {deadlines.length > 0 && (
            <div className="context" style={{ padding: 18 }}>
              <div style={{ font: 'var(--t-xs)', fontWeight: 700, marginBottom: 12 }}>Upcoming</div>
              {deadlines.map((p, i) => {
                const d = new Date(p.eventDate!)
                const urgent = i === 0
                return (
                  <Link
                    key={p.id}
                    href={`/vendor/projects/${p.slug}`}
                    className="flex gap-2.5 border-t border-[color:var(--line-soft)] py-2.5 first:border-0 first:pt-0"
                  >
                    <div
                      className="num w-[34px] text-center font-extrabold"
                      style={{ color: urgent ? 'var(--coral-deep)' : 'var(--forest)' }}
                    >
                      {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold">{p.title}</div>
                      <div className="text-[11.5px] text-[color:var(--muted)]">
                        {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        {p.client?.name ? ` · ${p.client.name}` : ''}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {activity.length > 0 && (
            <div className="context" style={{ padding: 18 }}>
              <div style={{ font: 'var(--t-xs)', fontWeight: 700, marginBottom: 12 }}>Recent</div>
              {activity.slice(0, 4).map(a => (
                <Link
                  key={a.id}
                  href={a.project ? `/vendor/projects/${a.project.slug}` : '/vendor/projects'}
                  className="block border-t border-[color:var(--line-soft)] py-2 first:border-0 first:pt-0"
                >
                  <div className="truncate text-[12.5px] font-semibold">{a.event}</div>
                  <div className="num text-[11px] text-[color:var(--muted)]">
                    {a.project?.title ? `${a.project.title} · ` : ''}
                    {new Date(a.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
