'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, FolderKanban, Users, Settings } from 'lucide-react'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { parseJsonResponse } from '@/lib/safe-json'
import { getNextAction } from '@/lib/journey'
import { isArchivedProject, type VendorProject } from '@/lib/vendor-phase1'
import NewProjectModal from '@/components/vendor/NewProjectModal'

const NAV = [
  { href: '/vendor', label: 'Today', icon: CalendarDays, exact: true },
  { href: '/vendor/projects', label: 'Projects', icon: FolderKanban },
  { href: '/vendor/clients', label: 'Clients', icon: Users },
  { href: '/vendor/settings', label: 'Settings', icon: Settings },
] as const

type VendorChromeValue = {
  openNewProject: () => void
  businessName: string
  userName: string
  /** False until /api/auth/me has resolved (success or failure). */
  profileLoaded: boolean
}

const VendorChromeContext = createContext<VendorChromeValue | null>(null)

export function useVendorChrome() {
  const ctx = useContext(VendorChromeContext)
  if (!ctx) {
    return {
      openNewProject: () => {},
      businessName: '',
      userName: '',
      profileLoaded: false,
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
  const inWorkspace = pathname.startsWith('/vendor/projects/') && pathname.split('/').length > 3
  const [businessName, setBusinessName] = useState('')
  const [userName, setUserName] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [todayCount, setTodayCount] = useState(0)
  const [projectCount, setProjectCount] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  // Identity loads once — never flash "Workspace" / "Account" placeholders.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await parseJsonResponse<{
          user?: { name?: string; vendorProfile?: { businessName?: string | null } | null }
        }>(meRes)
        if (cancelled || !me.ok || !me.data.user) return
        const nextBusiness = me.data.user.vendorProfile?.businessName?.trim() || ''
        const nextName = me.data.user.name?.trim() || ''
        setBusinessName(nextBusiness)
        setUserName(nextName)
        if (nextBusiness || nextName) setProfileLoaded(true)
      } catch {
        /* keep loading skeleton until a successful identity load */
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const projRes = await fetch('/api/vendor/projects')
      const proj = await parseJsonResponse<{ projects?: VendorProject[] }>(projRes)
      if (!cancelled && proj.ok) {
        const live = (proj.data.projects || []).filter(p => !isArchivedProject(p))
        setProjectCount(live.length)
        setTodayCount(live.filter(p => getNextAction(p.status).responsible === 'Vendor').length)
      }
    })()
    return () => { cancelled = true }
  }, [pathname])

  const openNewProject = useCallback(() => setShowCreate(true), [])

  const chrome = useMemo(
    () => ({ openNewProject, businessName, userName, profileLoaded }),
    [openNewProject, businessName, userName, profileLoaded],
  )

  const workspaceLabel = businessName.trim() || userName.trim()
  const workspaceInitial = (businessName || userName).charAt(0).toUpperCase()
  const profileInitial = (userName || businessName).charAt(0).toUpperCase()
  const profileLabel = userName.trim() || businessName.trim()
  const showIdentity = profileLoaded && !!workspaceLabel

  const badgeFor = (href: string) => {
    if (href === '/vendor' && todayCount > 0) return todayCount
    if (href === '/vendor/projects' && projectCount > 0) return projectCount
    return null
  }

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

          <div className="vendor-rail__profile">
            <span className="vendor-rail__avatar" aria-hidden>
              {showIdentity ? profileInitial : '·'}
            </span>
            <div className="min-w-0">
              {showIdentity && profileLabel ? (
                <>
                  <div className="truncate text-[13px] font-semibold">{profileLabel}</div>
                  <div className="text-[12px] text-[color:var(--on-dark-mut)]">Owner</div>
                </>
              ) : (
                <>
                  <div className="mb-1.5 h-3 w-24 animate-pulse rounded bg-[color:var(--nav-2)]" aria-hidden />
                  <div className="h-2.5 w-12 animate-pulse rounded bg-[color:var(--nav-2)]" aria-hidden />
                  <span className="sr-only">Loading profile</span>
                </>
              )}
            </div>
          </div>
        </aside>

        <div className="vendor-main">
          <header className="vendor-topbar">
            {inWorkspace ? (
              <Link href="/vendor/projects" className="text-[13.5px] font-semibold text-[color:var(--muted)]">
                ‹ Projects
              </Link>
            ) : (
              <>
                <span className="num text-[13px] text-[color:var(--muted)]">{formatTopbarDate()}</span>
                <button
                  type="button"
                  className="btn btn-forest ml-auto"
                  onClick={openNewProject}
                >
                  ＋ New project
                </button>
              </>
            )}
          </header>

          <main className={`vendor-body${inWorkspace ? ' vendor-body--workspace' : ''}`}>
            {children}
          </main>

          {!inWorkspace && (
            <nav className="vendor-tabbar" aria-label="Primary mobile">
              {NAV.map(item => {
                const active = isActive(pathname, item.href, 'exact' in item ? item.exact : undefined)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className="vendor-tabbar__link"
                  >
                    <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>
      </div>

      {showCreate && (
        <NewProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </VendorChromeContext.Provider>
  )
}
