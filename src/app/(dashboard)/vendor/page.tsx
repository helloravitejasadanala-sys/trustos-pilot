'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { getNextAction } from '@/lib/journey'
import {
  hasPendingPaymentConfirm,
  isArchivedProject,
  isVendorClosedProject,
  needsBalanceRequest,
  type VendorProject,
} from '@/lib/vendor-phase1'
import { hasUnread } from '@/lib/unread'
import {
  buildTodayQueue,
  pendingConfirmTotal,
  type TodayQueueItem,
} from '@/lib/today-queue'
import { parseJsonResponse } from '@/lib/safe-json'
import { projectTypeLabel } from '@/lib/project-types'
import { PROJECTS_LIST_CACHE_MS, useVendorChrome } from '@/components/vendor/VendorShell'
import { tabForActivityEvent, vendorProjectHref } from '@/lib/vendor-workspace'

/** Max items after "Do this first". */
const QUEUE_NEXT_N = 4

type ActivityItem = {
  id: string
  event: string
  label?: string
  createdAt: string
  project: { title: string; slug: string } | null
}

/** Prefer per-booking service over workspace primary (makeup in a photo workspace). */
function bookingService(p: VendorProject, workspacePrimary: string) {
  return p.service || workspacePrimary
}

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

function formatGbp(amount: number) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return null
  return `£${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`
}

function queueCopy(item: TodayQueueItem) {
  const clientLabel = item.p.client?.name?.split(' ')[0] || item.p.title || 'your client'
  if (item.kind === 'payment') {
    const total = pendingConfirmTotal(item.p)
    const money = total > 0 ? formatGbp(total) : null
    return {
      headline: money
        ? `Confirm ${money} from ${clientLabel}`
        : `Confirm payment from ${clientLabel}`,
      why: 'They said they paid — check and confirm so the job can move on.',
      cta: money ? `Confirm ${money} →` : 'Confirm payment →',
      ctaHref: vendorProjectHref(item.p.slug, 'Money'),
      chip: 'Payment' as const,
    }
  }
  if (item.kind === 'balance') {
    const schedule =
      item.p.hasPaymentSchedule || (item.p.paymentStages || []).length > 0
    return {
      headline: `Request the balance from ${clientLabel}`,
      why: schedule
        ? 'Deposit is in — open Money and request the next payment stage. The client won’t see it until you ask.'
        : 'Deposit is in and the job is past the event (or delivery is confirmed). Open Money to ask for the balance — the client won’t see it until you request it.',
      cta: 'Request balance →',
      ctaHref: vendorProjectHref(item.p.slug, 'Money'),
      chip: 'Balance' as const,
    }
  }
  if (item.kind === 'unread') {
    return {
      headline: `Reply to ${clientLabel}`,
      why: 'They messaged you — answer so they are not left waiting.',
      cta: 'Open messages →',
      ctaHref: vendorProjectHref(item.p.slug, 'Chat'),
      chip: 'Message' as const,
    }
  }
  if (item.kind === 'delivery') {
    return {
      headline: `Follow up after ${clientLabel} approved delivery`,
      why: 'They signed off on the files — request a review or wrap the booking.',
      cta: 'Open project →',
      ctaHref: vendorProjectHref(item.p.slug, 'Overview'),
      chip: 'Delivery' as const,
    }
  }
  if (item.kind === 'deadline') {
    return {
      headline: `Finish prep for ${clientLabel} — event tomorrow`,
      why: 'Date is close and prep still looks incomplete.',
      cta: 'Open prep →',
      ctaHref: vendorProjectHref(item.p.slug, 'Prep'),
      chip: 'Tomorrow' as const,
    }
  }
  if (item.kind === 'optional') {
    if (item.p.status === 'COMPLETED' && !item.p.review) {
      return {
        headline: `Request a review from ${clientLabel}`,
        why: 'Optional — closes the loop when you have a minute.',
        cta: item.na?.ctaLabel || 'Request review →',
        ctaHref: vendorProjectHref(item.p.slug, 'Overview'),
        chip: null,
      }
    }
    return {
      headline: `Capture a venue note for ${clientLabel}`,
      why: 'Optional — next time at this venue you’ll thank yourself.',
      cta: 'Open project →',
      ctaHref: vendorProjectHref(item.p.slug, 'Overview'),
      chip: null,
    }
  }
  return {
    headline: item.na?.nextAction || 'Open project',
    why: `Next step for ${clientLabel}.`,
    cta: item.na?.ctaLabel || 'Open project →',
    ctaHref: vendorProjectHref(item.p.slug, 'Overview'),
    chip: null,
  }
}

export default function TodayPage() {
  const {
    openNewProject,
    userName,
    businessName,
    primaryService,
    profileLoaded,
    projectsList,
    projectsListAt,
    publishProjectsList,
  } = useVendorChrome()
  const [projects, setProjects] = useState<VendorProject[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [business, setBusiness] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const cacheRef = useRef({ projectsList, projectsListAt, profileLoaded, businessName, userName })
  cacheRef.current = { projectsList, projectsListAt, profileLoaded, businessName, userName }

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = !!opts?.soft
    if (!soft) setLoadError(null)
    try {
      const cache = cacheRef.current
      // Soft refresh always hits the network so Money confirms are not stuck
      // behind the 15s shell cache while the vendor stays on Today.
      const cacheFresh =
        !soft &&
        !!cache.projectsList &&
        Date.now() - cache.projectsListAt < PROJECTS_LIST_CACHE_MS

      const projectsPromise = cacheFresh
        ? Promise.resolve({
            status: 200,
            ok: true as const,
            projects: cache.projectsList,
            fromCache: true,
          })
        : fetch('/api/vendor/projects').then(async res => {
            const parsed = await parseJsonResponse<{ projects?: VendorProject[]; error?: string }>(res)
            return {
              status: res.status,
              ok: parsed.ok,
              projects: parsed.data.projects,
              error: parsed.data.error,
              fromCache: false,
            }
          })

      const mePromise =
        cache.profileLoaded && (cache.businessName || cache.userName)
          ? Promise.resolve({ skip: true as const })
          : fetch('/api/auth/me').then(async res => ({
              skip: false as const,
              status: res.status,
              parsed: await parseJsonResponse<{
                user?: { name?: string; vendorProfile?: { businessName?: string } }
              }>(res),
            }))

      const [proj, actRes, me] = await Promise.all([
        projectsPromise,
        fetch('/api/vendor/activity'),
        mePromise,
      ])

      if (proj.status === 401 || (!me.skip && me.status === 401)) {
        setLoadError('Your session expired. Please sign in again.')
        return
      }
      if (proj.status === 403) {
        setLoadError('This workspace is suspended. Contact support if you need access restored.')
        return
      }
      if (!proj.ok) {
        setLoadError(proj.error || 'Could not load your projects. Please refresh and try again.')
        return
      }
      const list = proj.projects || []
      if (!proj.fromCache) publishProjectsList(list)
      setProjects(list.filter((p: VendorProject) => !isArchivedProject(p)))
      const act = await parseJsonResponse<{ activity?: ActivityItem[] }>(actRes)
      if (act.ok) setActivity(act.data.activity || [])
      if (me.skip) {
        setBusiness(cache.businessName || '')
        setOwnerName(cache.userName || '')
      } else if (me.parsed.ok) {
        setBusiness(me.parsed.data.user?.vendorProfile?.businessName || '')
        setOwnerName(me.parsed.data.user?.name || '')
      }
      if (soft) setLoadError(null)
    } catch {
      if (!soft) setLoadError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [publishProjectsList])

  useEffect(() => {
    load()
  }, [load])

  // Shell soft-polls /api/vendor/projects — bind Today to that list so Money
  // confirms clear "Payments to confirm" without waiting for a focus refetch.
  useEffect(() => {
    if (!projectsList) return
    setProjects(projectsList.filter(p => !isArchivedProject(p)))
  }, [projectsList])

  // Keep Today in sync when returning from Projects / another tab.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') load({ soft: true })
    }
    function onFocus() {
      load({ soft: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const servicesSoon = useMemo(() => {
    return projects
      .filter(p => p.eventDate && (p.eventDate.startsWith(todayStr) || p.eventDate.startsWith(tomorrowStr)))
      .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime())
  }, [projects, todayStr, tomorrowStr])

  const liveProjects = useMemo(
    () => projects.filter(p => !isVendorClosedProject(p)),
    [projects],
  )

  const waitingVendor = liveProjects.filter(
    p => getNextAction(p.status, bookingService(p, primaryService)).responsible === 'Vendor',
  )
  const waitingClient = liveProjects.filter(
    p => getNextAction(p.status, bookingService(p, primaryService)).responsible === 'Client',
  )

  const unreadProjects = liveProjects.filter(p => hasUnread(p.id, p.lastClientMessageAt))
  const pendingPayments = liveProjects.filter(p => hasPendingPaymentConfirm(p))
  const balanceNudges = liveProjects.filter(p => needsBalanceRequest(p))
  /** Client owes deposit (signed, not yet paid). */
  const depositWaiting = liveProjects.filter(p => p.status === 'CONTRACT_SIGNED')
  /** Deposit or full payment confirmed on live bookings. */
  const moneySettled = liveProjects.filter(
    p => p.status === 'DEPOSIT_PAID' || p.status === 'FULLY_PAID',
  )

  // Tiered Today queue — oldest / longest-wait within each tier (never last-created).
  const queue: TodayQueueItem[] = useMemo(
    () =>
      buildTodayQueue(projects, {
        primaryService,
        isUnread: p => hasUnread(p.id, p.lastClientMessageAt),
      }),
    [projects, primaryService],
  )

  const focus = queue[0] || null
  // Unreads get their own Messages panel — keep Next up for other work.
  const nextUp = queue.slice(1, 1 + QUEUE_NEXT_N).filter(item => item.kind !== 'unread')

  const moneyHref = (list: VendorProject[], tab: 'Money' | 'Chat' = 'Money') =>
    list[0] ? vendorProjectHref(list[0].slug, tab) : '/vendor/projects'

  const showMoneyGlance = liveProjects.length > 0
  const moneyGlanceQuiet =
    pendingPayments.length === 0 &&
    balanceNudges.length === 0 &&
    depositWaiting.length === 0 &&
    moneySettled.length === 0

  const deadlines = useMemo(() => {
    return projects
      .filter(p => p.eventDate && new Date(p.eventDate) >= new Date())
      .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime())
      .slice(0, 5)
  }, [projects])

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
          Your workspace is ready{workspaceName ? ` (${workspaceName})` : ''}. Start with your first booking — nothing else is missing.
        </p>
        <ol className="mb-5 max-w-[42ch] space-y-1.5 text-[13.5px] text-[color:var(--muted)]" style={{ margin: '0 0 20px', paddingLeft: 18 }}>
          <li><span style={{ color: 'var(--ink)', fontWeight: 600 }}>01</span> Create a booking</li>
          <li><span style={{ color: 'var(--ink)', fontWeight: 600 }}>02</span> Share the secure link</li>
          <li><span style={{ color: 'var(--ink)', fontWeight: 600 }}>03</span> Your client confirms — no account for them</li>
        </ol>
        <div className="action" style={{ maxWidth: 620 }}>
          <div className="kicker mb-2.5 text-[color:var(--lime)]">Do this first</div>
          <div style={{ font: 'var(--t-h1)', marginBottom: 6 }}>Create your first booking</div>
          <p className="mb-5 max-w-[48ch] text-[13.5px] text-[color:var(--on-dark-mut)]">
            Add the client and job. You’ll get a secure link to share — they don’t need an account.
          </p>
          <button type="button" className="btn btn-lime" onClick={() => openNewProject()}>
            ＋ New booking
          </button>
        </div>
      </div>
    )
  }

  const focusProject = focus?.p
  const focusEventDate = focusProject?.eventDate ? new Date(focusProject.eventDate) : null
  const focusUi = focus
    ? queueCopy(focus)
    : {
        headline: 'No bookings need you today',
        why: waitingClient.length > 0
          ? `You’re waiting on ${waitingClient.length} client${waitingClient.length === 1 ? '' : 's'} — everything else is under control.`
          : 'Everything is under control.',
        cta: 'Browse bookings →',
        ctaHref: '/vendor/projects',
        chip: null as null,
      }

  const summaryBits = [
    queue.length > 0 ? `${queue.length} need${queue.length === 1 ? 's' : ''} you` : null,
    waitingClient.length > 0 ? `${waitingClient.length} waiting on clients` : null,
    unreadProjects.length > 0 ? `${unreadProjects.length} unread` : null,
    pendingPayments.length > 0 ? `${pendingPayments.length} payment${pendingPayments.length === 1 ? '' : 's'} to confirm` : null,
    balanceNudges.length > 0 ? `${balanceNudges.length} balance${balanceNudges.length === 1 ? '' : 's'} to request` : null,
  ].filter(Boolean)

  return (
    <div>
      {/* Mobile compact greeting — date lives in pinned chrome (VendorShell). */}
      <div className="vendor-mobile-head mb-3">
        <div>
          <h1 className="serif vendor-large-title" style={{ fontSize: 26, lineHeight: 1.05 }}>
            {greetingLine}
          </h1>
          {summaryBits.length > 0 && (
            <p className="mt-1 text-[12.5px] text-[color:var(--muted)]">{summaryBits.join(' · ')}</p>
          )}
        </div>
        <Link
          href="/vendor/settings"
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: 'var(--lime)',
            color: 'var(--lime-ink)',
            textDecoration: 'none',
            display: 'grid',
            placeItems: 'center',
            font: '800 15px/1 var(--font-ui)',
            flexShrink: 0,
          }}
          aria-label="Open settings"
          title="Settings"
        >
          {avatarLetter || '·'}
        </Link>
      </div>

      {/* Desktop greeting */}
      <div className="mb-5 hidden md:block">
        <h1 className="serif vendor-large-title" style={{ fontSize: 32, lineHeight: 1 }}>
          {greetingLine}
        </h1>
        <p className="mt-1 text-[color:var(--muted)]">
          {summaryBits.length > 0 ? summaryBits.join(' · ') : 'No bookings need you right now'}
        </p>
      </div>

      <div className="today-grid">
        <div className="today-stack">
          {showMoneyGlance && (
            <div>
              <div className="kicker mb-2.5">Money at a glance</div>
              {moneyGlanceQuiet ? (
                <p className="m-0 text-[13.5px] text-[color:var(--muted)]">No payments moving yet</p>
              ) : (
              <div className="today-money-glance" aria-label="Money at a glance">
                <Link
                  href={moneyHref(pendingPayments)}
                  className="today-money-tile"
                  data-alert={pendingPayments.length > 0 ? 'true' : 'false'}
                >
                  <span className="today-money-tile__num num">{pendingPayments.length}</span>
                  <span className="today-money-tile__label">To confirm</span>
                </Link>
                <Link
                  href={moneyHref(balanceNudges)}
                  className="today-money-tile"
                  data-alert={balanceNudges.length > 0 ? 'true' : 'false'}
                >
                  <span className="today-money-tile__num num">{balanceNudges.length}</span>
                  <span className="today-money-tile__label">Balance due</span>
                </Link>
                <Link
                  href={moneyHref(depositWaiting)}
                  className="today-money-tile"
                  data-alert={depositWaiting.length > 0 ? 'true' : 'false'}
                >
                  <span className="today-money-tile__num num">{depositWaiting.length}</span>
                  <span className="today-money-tile__label">Deposit waiting</span>
                </Link>
                <Link
                  href={moneyHref(moneySettled)}
                  className="today-money-tile"
                  data-tone="settled"
                >
                  <span className="today-money-tile__num num">{moneySettled.length}</span>
                  <span className="today-money-tile__label">Deposit in</span>
                </Link>
              </div>
              )}
            </div>
          )}

          {/* Do This First */}
          <div>
            <div className="kicker mb-2.5 text-[color:var(--lime)]">● Do this first</div>
            <div className="action">
              <div className="flex gap-3 md:gap-5">
                {focusProject && focusEventDate && !isNaN(focusEventDate.getTime()) && (
                  <div className="today-date-block">
                    <span className="kicker text-[color:var(--lime)]">
                      {focusEventDate.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </span>
                    <div>
                      <div className="num text-[22px] font-extrabold leading-none md:text-[30px]">
                        {focusEventDate.getDate()}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[color:var(--on-dark-mut)]">
                        {focusEventDate.toLocaleDateString('en-GB', { month: 'short' })}
                      </div>
                    </div>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {focusProject && (
                    <div className="mb-2.5 flex flex-wrap items-center gap-2">
                      <span
                        className={markerClass(focusProject.type)}
                        style={{ width: 26, height: 26, fontSize: 12 }}
                        aria-hidden
                      >
                        {markerLetter(focusProject.type, focusProject.title)}
                      </span>
                      <span className="text-[13px] font-semibold">
                        {focusProject.client?.name || 'Client'} · {projectTypeLabel(focusProject.type || 'OTHER')}
                      </span>
                      {focusUi.chip === 'Payment' && <span className="chip chip-coral">Payment</span>}
                      {focusUi.chip === 'Balance' && <span className="chip chip-muted">Balance</span>}
                      {focusUi.chip === 'Message' && <span className="chip chip-coral">Message</span>}
                      {focusUi.chip === 'Delivery' && <span className="chip chip-coral">Delivery</span>}
                      {focusUi.chip === 'Tomorrow' && <span className="chip chip-muted">Tomorrow</span>}
                    </div>
                  )}
                  <div style={{ font: 'var(--t-h1)', marginBottom: 6 }}>{focusUi.headline}</div>
                  <p className="m-0 max-w-[46ch] text-[13px] text-[color:var(--on-dark-mut)]">{focusUi.why}</p>
                </div>
              </div>
              <div className="mt-4 md:mt-5">
                <Link href={focusUi.ctaHref} className="btn btn-lime w-full md:w-auto">
                  {focusUi.cta}
                </Link>
              </div>
            </div>
          </div>

          {unreadProjects.length > 0 && (
            <div>
              <div className="mb-2.5 flex items-baseline justify-between">
                <h2 style={{ font: 'var(--t-h2)', margin: 0 }}>Messages</h2>
                <span className="num text-[12px] text-[color:var(--coral-deep,#c45c3e)]">
                  {unreadProjects.length} unread
                </span>
              </div>
              <div
                className="panel overflow-hidden"
                style={{ borderLeft: '3px solid var(--coral-deep, #c45c3e)' }}
              >
                {unreadProjects.slice(0, 6).map(p => {
                  const clientLabel = p.client?.name || p.title
                  return (
                    <Link
                      key={p.id}
                      href={vendorProjectHref(p.slug, 'Chat')}
                      className="today-service-row"
                    >
                      <span
                        className={markerClass(p.type)}
                        style={{ width: 32, height: 32, fontSize: 12 }}
                        aria-hidden
                      >
                        {markerLetter(p.type, p.title)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold">{clientLabel}</div>
                        <div className="truncate text-[12px] text-[color:var(--muted)]">
                          New message — reply in Chat
                        </div>
                      </div>
                      <span className="chip chip-coral">Unread</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {nextUp.length > 0 && (
            <div>
              <div className="mb-2.5 flex items-baseline justify-between">
                <h2 style={{ font: 'var(--t-h2)', margin: 0 }}>Next up</h2>
                <span className="num text-[12px] text-[color:var(--muted)]">{nextUp.length}</span>
              </div>
              <div className="panel overflow-hidden" style={{ borderLeft: '3px solid var(--lime)' }}>
                {nextUp.map(item => {
                  const copy = queueCopy(item)
                  return (
                    <Link key={`${item.kind}-${item.p.id}`} href={copy.ctaHref} className="today-service-row">
                      <span className={markerClass(item.p.type)} style={{ width: 32, height: 32, fontSize: 12 }} aria-hidden>
                        {markerLetter(item.p.type, item.p.title)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold">
                          {item.p.client?.name || item.p.title}
                        </div>
                        <div className="truncate text-[12px] text-[color:var(--muted)]">
                          {copy.headline}
                        </div>
                      </div>
                      {copy.chip && (
                        <span
                          className={
                            copy.chip === 'Message' || copy.chip === 'Payment' || copy.chip === 'Delivery'
                              ? 'chip chip-coral'
                              : 'chip chip-muted'
                          }
                        >
                          {copy.chip}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {waitingClient.length > 0 && (
            <div>
              <div className="mb-2.5 flex items-baseline justify-between">
                <h2 style={{ font: 'var(--t-h2)', margin: 0 }}>Waiting on client</h2>
                <span className="num text-[12px] text-[color:var(--muted)]">{waitingClient.length}</span>
              </div>
              <div className="panel overflow-hidden" style={{ borderLeft: '3px solid var(--lavender, #b8a9d4)' }}>
                {waitingClient.slice(0, 5).map(p => {
                  const na = getNextAction(p.status, bookingService(p, primaryService))
                  const clientLabel = p.client?.name || 'Client'
                  return (
                    <Link
                      key={`wait-${p.id}`}
                      href={vendorProjectHref(p.slug, 'Overview')}
                      className="today-service-row"
                    >
                      <span className={markerClass(p.type)} style={{ width: 32, height: 32, fontSize: 12 }} aria-hidden>
                        {markerLetter(p.type, p.title)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold">{clientLabel}</div>
                        <div className="truncate text-[12px] text-[color:var(--muted)]">
                          {na.status === 'CONTRACT_SENT'
                            ? `Waiting for ${clientLabel} to sign`
                            : na.nextAction}
                        </div>
                      </div>
                      <span className="chip chip-muted">Waiting</span>
                    </Link>
                  )
                })}
              </div>
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
                  const na = getNextAction(p.status, bookingService(p, primaryService))
                  const chip = 'chip chip-muted'
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
        </div>

        {/* Context rail */}
        <div className="today-stack hidden gap-4 md:flex" style={{ gap: 16 }}>
          {unreadProjects.length > 0 && (
            <div className="context" style={{ padding: 18 }}>
              <div className="mb-3 flex items-center gap-2">
                <span
                  style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--coral-deep, #c45c3e)' }}
                  aria-hidden
                />
                <div style={{ font: 'var(--t-xs)', fontWeight: 700 }}>Unread messages</div>
                <span className="num ml-auto text-[12px] text-[color:var(--coral-deep,#c45c3e)]">
                  {unreadProjects.length}
                </span>
              </div>
              {unreadProjects.slice(0, 4).map(p => (
                <Link
                  key={p.id}
                  href={vendorProjectHref(p.slug, 'Chat')}
                  className="panel mb-2.5 last:mb-0 block"
                  style={{ padding: 13, boxShadow: 'none', textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="mb-1 truncate text-[13px] font-semibold">
                    {p.client?.name || p.title}
                  </div>
                  <div className="text-[12px] font-semibold text-[color:var(--coral-deep,#c45c3e)]">
                    Open chat →
                  </div>
                </Link>
              ))}
            </div>
          )}

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
                    {getNextAction(p.status, bookingService(p, primaryService)).nextAction}
                  </div>
                  <Link
                    href={`/vendor/projects/${p.slug}`}
                    className="btn btn-ghost"
                    style={{ minHeight: 40, padding: '0 14px', fontSize: 13.5 }}
                  >
                    Open booking →
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
                  href={
                    a.project
                      ? vendorProjectHref(a.project.slug, tabForActivityEvent(a.event))
                      : '/vendor/projects'
                  }
                  className="block border-t border-[color:var(--line-soft)] py-2 first:border-0 first:pt-0"
                >
                  <div className="truncate text-[12.5px] font-semibold">{a.label || a.event}</div>
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
