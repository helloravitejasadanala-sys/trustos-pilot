'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Trophy,
  Users,
  MessageSquare,
  Activity,
  Settings,
  Menu,
  X,
} from 'lucide-react'
import { ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/workspaces', label: 'Workspaces', icon: Building2 },
  { href: '/admin/venues', label: 'Venue Research', icon: MapPin },
  { href: '/admin/contributors', label: 'Research Contributors', icon: Trophy },
  { href: '/admin/users', label: 'Pilot Users', icon: Users },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/admin/health', label: 'System Health', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
] as const

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const nav = (
    <nav className="flex flex-col gap-0.5 px-2 py-3" aria-label="Company dashboard">
      {NAV.map(item => {
        const active = isActive(pathname, item.href, 'exact' in item ? item.exact : undefined)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
              active
                ? 'bg-ink-900 text-white'
                : 'text-ink-600 hover:bg-neutral-100 hover:text-ink-900',
            )}
          >
            <Icon size={16} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-sand-50 text-ink-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 border-r border-neutral-200 bg-white md:flex md:flex-col">
          <div className="border-b border-neutral-100 px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              TrustOS
            </div>
            <div className="mt-0.5 text-sm font-semibold text-ink-900">Company Dashboard</div>
          </div>
          {nav}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
            <button
              type="button"
              className="rounded-lg p-2 text-ink-600 hover:bg-neutral-100"
              onClick={() => setOpen(v => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                TrustOS
              </div>
              <div className="text-sm font-semibold">Company Dashboard</div>
            </div>
          </header>

          {open && (
            <div className="border-b border-neutral-200 bg-white md:hidden">{nav}</div>
          )}

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
