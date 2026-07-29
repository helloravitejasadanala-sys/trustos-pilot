'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { CalendarDays, FolderKanban, Users, Settings, Bell } from 'lucide-react'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'react-hot-toast'
import { parseJsonResponse } from '@/lib/safe-json'
import { getNextAction } from '@/lib/journey'
import {
  hasPendingPaymentConfirm,
  isArchivedProject,
  isVendorClosedProject,
  needsBalanceRequest,
  type VendorProject,
} from '@/lib/vendor-phase1'
import { hasUnread } from '@/lib/unread'
import { playMessageChime } from '@/lib/notify'
import { vendorProjectHref } from '@/lib/vendor-workspace'

const NewProjectModal = dynamic(() => import('@/components/vendor/NewProjectModal'), {
  ssr: false,
})

const NAV = [
  { href: '/vendor', label: 'Today', icon: CalendarDays, exact: true },
  { href: '/vendor/projects', label: 'Projects', icon: FolderKanban },
  { href: '/vendor/clients', label: 'Clients', icon: Users },
  { href: '/vendor/settings', label: 'Settings', icon: Settings },
] as const

export type NewBookingPrefill = {
  clientName?: string
  clientEmail?: string
  clientPhone?: string | null
}

type VendorChromeValue = {
  openNewProject: (prefill?: NewBookingPrefill) => void
  businessName: string
  userName: string
  primaryService: string
  /** False until /api/auth/me has resolved (success or failure). */
  profileLoaded: boolean
  /** Shared projects list from shell poll — Today/Projects reuse when fresh. */
  projectsList: VendorProject[] | null
  projectsListAt: number
  publishProjectsList: (projects: VendorProject[]) => void
}

const VendorChromeContext = createContext<VendorChromeValue | null>(null)

/** Reuse shell-polled list if younger than this (avoids double fetch on Today mount). */
export const PROJECTS_LIST_CACHE_MS = 15_000

export function useVendorChrome() {
  const ctx = useContext(VendorChromeContext)
  if (!ctx) {
    return {
      openNewProject: () => {},
      businessName: '',
      userName: '',
      primaryService: 'PHOTOGRAPHY',
      profileLoaded: false,
      projectsList: null,
      projectsListAt: 0,
      publishProjectsList: () => {},
    }
  }
  return ctx
}

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function formatTopbarDate(d = new Date()) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function VendorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const inWorkspace = pathname.startsWith('/vendor/projects/') && pathname.split('/').length > 3
  const [businessName, setBusinessName] = useState('')
  const [userName, setUserName] = useState('')
  const [primaryService, setPrimaryService] = useState('PHOTOGRAPHY')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [todayCount, setTodayCount] = useState(0)
  const [projectCount, setProjectCount] = useState(0)
  /** Messages + payment-to-confirm + agreement signed (CONTRACT_SIGNED). */
  const [inboxCount, setInboxCount] = useState(0)
  const [firstPaymentSlug, setFirstPaymentSlug] = useState<string | null>(null)
  const [firstUnreadSlug, setFirstUnreadSlug] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createPrefill, setCreatePrefill] = useState<NewBookingPrefill | null>(null)
  const [projectsList, setProjectsList] = useState<VendorProject[] | null>(null)
  const [projectsListAt, setProjectsListAt] = useState(0)
  const lastInboundRef = useRef<Record<string, string>>({})
  const inboundPrimedRef = useRef(false)

  const publishProjectsList = useCallback((projects: VendorProject[]) => {
    setProjectsList(projects)
    setProjectsListAt(Date.now())
  }, [])
  // Stable poll loop — must not restart on every Today↔Projects↔Clients nav.
  const pathnameRef = useRef(pathname)
  const primaryServiceRef = useRef(primaryService)
  const routerRef = useRef(router)
  pathnameRef.current = pathname
  primaryServiceRef.current = primaryService
  routerRef.current = router

  // Identity loads once — never flash "Workspace" / "Account" placeholders.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await parseJsonResponse<{
          user?: {
            name?: string
            vendorProfile?: { businessName?: string | null; primaryService?: string | null } | null
          }
        }>(meRes)
        if (cancelled || !me.ok || !me.data.user) return
        const nextBusiness = me.data.user.vendorProfile?.businessName?.trim() || ''
        const nextName = me.data.user.name?.trim() || ''
        const nextService = me.data.user.vendorProfile?.primaryService?.trim() || 'PHOTOGRAPHY'
        setBusinessName(nextBusiness)
        setUserName(nextName)
        setPrimaryService(nextService)
        if (nextBusiness || nextName) setProfileLoaded(true)
      } catch {
        /* keep loading skeleton until a successful identity load */
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Counts + inbound message awareness — runs across the vendor app, not only Chat.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function refresh() {
      if (cancelled) return
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(refresh, 8000)
        return
      }
      try {
        const projRes = await fetch('/api/vendor/projects')
        const proj = await parseJsonResponse<{ projects?: VendorProject[] }>(projRes)
        if (!cancelled && proj.ok) {
          const all = proj.data.projects || []
          publishProjectsList(all)
          const live = all.filter(
            p => !isArchivedProject(p) && !isVendorClosedProject(p),
          )
          setProjectCount(all.filter(p => !isArchivedProject(p)).length)
          setTodayCount(
            live.filter(p => {
              const service = p.service || primaryServiceRef.current
              return (
                hasPendingPaymentConfirm(p) ||
                needsBalanceRequest(p) ||
                hasUnread(p.id, p.lastClientMessageAt) ||
                getNextAction(p.status, service).responsible === 'Vendor'
              )
            }).length,
          )

          const unread = live.filter(p => hasUnread(p.id, p.lastClientMessageAt))
          const waitingPay = live.filter(p => hasPendingPaymentConfirm(p))
          const signedAwaitingDeposit = live.filter(p => p.status === 'CONTRACT_SIGNED')
          // One project once — same signals Today already surfaces.
          const inboxIds = new Set<string>()
          for (const p of [...waitingPay, ...unread, ...signedAwaitingDeposit]) inboxIds.add(p.id)
          setInboxCount(inboxIds.size)
          setFirstPaymentSlug(waitingPay[0]?.slug || null)
          setFirstUnreadSlug(unread[0]?.slug || null)

          // Toast + soft when a client message lands while the vendor is elsewhere.
          if (!inboundPrimedRef.current) {
            inboundPrimedRef.current = true
            const seed: Record<string, string> = {}
            for (const p of live) {
              if (p.lastClientMessageAt) seed[p.id] = p.lastClientMessageAt
            }
            lastInboundRef.current = seed
          } else {
            const path = pathnameRef.current
            const inChat = path.includes('/vendor/projects/') && path.split('/').length > 3
            for (const p of live) {
              const at = p.lastClientMessageAt
              if (!at) continue
              const prev = lastInboundRef.current[p.id]
              if (prev && new Date(at).getTime() > new Date(prev).getTime()) {
                if (!inChat || !path.includes(p.slug)) {
                  const from = p.client?.name || p.title || 'Client'
                  const href = vendorProjectHref(p.slug, 'Chat')
                  toast(
                    t => (
                      <button
                        type="button"
                        onClick={() => {
                          routerRef.current.push(href)
                          toast.dismiss(t.id)
                        }}
                        style={{
                          background: 'transparent',
                          border: 0,
                          padding: 0,
                          margin: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                          font: 'inherit',
                          color: 'inherit',
                        }}
                      >
                        New message from {from}
                        <span style={{ display: 'block', fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                          Open chat →
                        </span>
                      </button>
                    ),
                    { id: `vendor-inbox-${p.id}` },
                  )
                  playMessageChime()
                }
              }
              lastInboundRef.current[p.id] = at
            }
          }
        }
      } catch {
        /* keep polling */
      }
      if (!cancelled) timer = setTimeout(refresh, 8000)
    }

    refresh()

    function onVisibility() {
      if (cancelled || document.hidden) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(refresh, 200)
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // Intentionally empty deps: poll must not restart on pathname / service changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- publishProjectsList is stable
  }, [publishProjectsList])

  const openNewProject = useCallback((prefill?: NewBookingPrefill) => {
    setCreatePrefill(prefill ?? null)
    setShowCreate(true)
  }, [])

  const chrome = useMemo(
    () => ({
      openNewProject,
      businessName,
      userName,
      primaryService,
      profileLoaded,
      projectsList,
      projectsListAt,
      publishProjectsList,
    }),
    [
      openNewProject,
      businessName,
      userName,
      primaryService,
      profileLoaded,
      projectsList,
      projectsListAt,
      publishProjectsList,
    ],
  )

  const workspaceLabel = businessName.trim() || userName.trim()
  const workspaceInitial = (businessName || userName).charAt(0).toUpperCase()
  const profileInitial = (userName || businessName).charAt(0).toUpperCase()
  const profileLabel = userName.trim() || businessName.trim()
  const showIdentity = profileLoaded && !!workspaceLabel
  // Most urgent: payment confirm → Money; else unread chat; else Today.
  const notifyHref = firstPaymentSlug
    ? vendorProjectHref(firstPaymentSlug, 'Money')
    : firstUnreadSlug
      ? vendorProjectHref(firstUnreadSlug, 'Chat')
      : '/vendor'

  const notifyActive = inboxCount > 0
  const notifyLabel = notifyActive ? `${inboxCount} new` : 'Inbox'
  const notifyAria = notifyActive
    ? `${inboxCount} waiting — payments, signed agreements, or messages`
    : 'Inbox — nothing waiting'

  const badgeFor = (href: string) => {
    if (href === '/vendor' && inboxCount > 0) return inboxCount
    if (href === '/vendor' && todayCount > 0) return todayCount
    if (href === '/vendor/projects' && projectCount > 0) return projectCount
    return null
  }

  const tabBadgeFor = (href: string) => {
    if (href === '/vendor' && inboxCount > 0) return inboxCount
    return null
  }

  const notifyLink = (className: string) => (
    <Link
      href={notifyHref}
      className={className}
      data-active={notifyActive ? 'true' : 'false'}
      aria-label={notifyAria}
    >
      <Bell size={15} strokeWidth={notifyActive ? 2.4 : 1.8} aria-hidden />
      {notifyLabel}
    </Link>
  )

  return (
    <VendorChromeContext.Provider value={chrome}>
      <div className="vendor-shell">
        <aside className="vendor-rail" aria-label="Workspace">
          <Link href="/vendor" className="vendor-rail__brand">
            <span className="vendor-rail__mark" aria-hidden>
              {showIdentity ? workspaceInitial : '·'}
            </span>
            <span className="min-w-0">
              {showIdentity ? (
                <>
                  <span className="block truncate text-[14px] font-bold leading-tight">{workspaceLabel}</span>
                  <span className="block text-[12px] text-[color:var(--on-dark-mut)]">Workspace</span>
                </>
              ) : (
                <>
                  <span className="mb-1.5 block h-3.5 w-28 animate-pulse rounded bg-[color:var(--nav-2)]" aria-hidden />
                  <span className="block h-2.5 w-16 animate-pulse rounded bg-[color:var(--nav-2)]" aria-hidden />
                  <span className="sr-only">Loading workspace</span>
                </>
              )}
            </span>
          </Link>

          <nav className="vendor-rail__nav" aria-label="Primary">
            {NAV.map(item => {
              const active = isActive(pathname, item.href, 'exact' in item ? item.exact : undefined)
              const Icon = item.icon
              const badge = badgeFor(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className="vendor-rail__link"
                >
                  <Icon size={18} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  {item.label}
                  {badge != null && <span className="vendor-rail__bdg num">{badge}</span>}
                </Link>
              )
            })}
          </nav>

          <Link
            href="/vendor/settings"
            className="vendor-rail__profile"
            aria-label="Open settings"
          >
            <span className="vendor-rail__avatar" aria-hidden>
              {showIdentity ? profileInitial : '·'}
            </span>
            <div className="min-w-0">
              {showIdentity && profileLabel ? (
                <>
                  <div className="truncate text-[13px] font-semibold">{profileLabel}</div>
                  <div className="text-[12px] text-[color:var(--on-dark-mut)]">Settings</div>
                </>
              ) : (
                <>
                  <div className="mb-1.5 h-3 w-24 animate-pulse rounded bg-[color:var(--nav-2)]" aria-hidden />
                  <div className="h-2.5 w-12 animate-pulse rounded bg-[color:var(--nav-2)]" aria-hidden />
                  <span className="sr-only">Loading profile</span>
                </>
              )}
            </div>
          </Link>
        </aside>

        <div className="vendor-main">
          <header className="vendor-topbar">
            {inWorkspace ? (
              <Link href="/vendor/projects" className="vendor-back">
                ‹ Projects
              </Link>
            ) : (
              <span className="num text-[13px] text-[color:var(--muted)]">{formatTopbarDate()}</span>
            )}
            {notifyLink('vendor-topbar__notify')}
            <button
              type="button"
              className="btn btn-forest"
              onClick={() => openNewProject()}
            >
              ＋ New booking
            </button>
          </header>

          {/* Mobile list pages: topbar is hidden — Bell must still be reachable. */}
          {!inWorkspace && (
            <div className="vendor-mobile-inboxbar">
              {notifyLink('vendor-topbar__notify vendor-mobile-inboxbar__notify')}
            </div>
          )}

          {inWorkspace && (
            <div className="vendor-workspace-mobilebar">
              <Link href="/vendor/projects" className="vendor-workspace-mobilebar__back">
                ‹ Projects
              </Link>
              <div className="vendor-workspace-mobilebar__actions">
                {notifyLink('vendor-topbar__notify vendor-workspace-mobilebar__notify')}
                <button
                  type="button"
                  className="btn btn-forest"
                  style={{ minHeight: 40, padding: '0 14px', fontSize: 13 }}
                  onClick={() => openNewProject()}
                >
                  ＋ New booking
                </button>
              </div>
            </div>
          )}

          <main className={`vendor-body${inWorkspace ? ' vendor-body--workspace' : ''}`}>
            {children}
          </main>

          {!inWorkspace && (
            <nav className="vendor-tabbar" aria-label="Primary mobile">
              {NAV.map(item => {
                const active = isActive(pathname, item.href, 'exact' in item ? item.exact : undefined)
                const Icon = item.icon
                const badge = tabBadgeFor(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className="vendor-tabbar__link"
                  >
                    <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                    {item.label}
                    {badge != null && <span className="vendor-tabbar__bdg num">{badge}</span>}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>
      </div>

      {showCreate && (
        <NewProjectModal
          prefill={createPrefill ?? undefined}
          onClose={() => {
            setShowCreate(false)
            setCreatePrefill(null)
          }}
          onCreated={() => {
            setShowCreate(false)
            setCreatePrefill(null)
          }}
        />
      )}
    </VendorChromeContext.Provider>
  )
}
