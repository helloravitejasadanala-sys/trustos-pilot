'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, FolderKanban, Users, Settings, Palette } from 'lucide-react'
import { ReactNode } from 'react'

const NAV = [
  { href: '/vendor', label: 'Today', icon: CalendarDays, exact: true },
  { href: '/vendor/projects', label: 'Projects', icon: FolderKanban },
  { href: '/vendor/clients', label: 'Clients', icon: Users },
  { href: '/vendor/templates', label: 'Templates', icon: Palette },
  { href: '/vendor/settings', label: 'Settings', icon: Settings },
] as const

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function VendorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const inWorkspace = pathname.startsWith('/vendor/projects/') && pathname.split('/').length > 3

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-52 md:flex-col md:border-r md:border-forest-100 md:bg-white">
          <div className="flex h-14 items-center border-b border-forest-100 px-4">
            <Link href="/vendor" className="flex items-center gap-2 hover:opacity-80">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-forest-950 text-[11px] font-bold text-paper-50">T</span>
              <span className="text-sm font-semibold tracking-tight text-forest-950">TrustOS</span>
            </Link>
          </div>
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {NAV.map(item => {
              const active = isActive(pathname, item.href, 'exact' in item ? item.exact : undefined)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                    active ? 'bg-forest-50 text-forest-900' : 'text-forest-600 hover:bg-forest-50/70 hover:text-forest-900'
                  }`}
                >
                  <Icon size={17} strokeWidth={active ? 2.25 : 1.75} className={active ? 'text-forest-700' : 'text-forest-400'} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          {/* Mobile header */}
          <header className="md:hidden sticky top-0 z-20 flex h-12 items-center border-b border-forest-100 bg-white/95 px-4 backdrop-blur">
            <Link href="/vendor" className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-forest-950 text-[10px] font-bold text-paper-50">T</span>
              <span className="text-sm font-semibold text-forest-950">TrustOS</span>
            </Link>
          </header>

          <main className={`flex-1 ${inWorkspace ? '' : 'pb-20 md:pb-8'}`}>
            {children}
          </main>

          {/* Mobile bottom nav */}
          {!inWorkspace && (
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-forest-100 bg-white/95 backdrop-blur px-2 py-2">
              <div className="grid grid-cols-5 gap-1">
                {NAV.map(item => {
                  const active = isActive(pathname, item.href, 'exact' in item ? item.exact : undefined)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition-colors ${
                        active ? 'bg-forest-50 text-forest-900' : 'text-forest-400'
                      }`}
                    >
                      <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}
