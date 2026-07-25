import { ReactNode } from 'react'
import Link from 'next/link'
import { BrandMark } from './BrandMark'
import { cn } from '@/lib/utils'

export type AuthNavItem = { href: string; label: string }

/**
 * Shared shell for Login / Signup / Forgot password.
 * Visual atmosphere preserved; brand comes from props.
 */
export function AuthLayout({
  brandName,
  brandBadge,
  nav = [],
  children,
  maxWidth = 'sm',
  className,
}: {
  brandName: string
  brandBadge?: string
  nav?: AuthNavItem[]
  children: ReactNode
  maxWidth?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={cn('relative min-h-screen overflow-x-hidden bg-paper text-ink-900', className)}>
      <AuthAtmosphere />

      <header className="sticky top-0 z-40 border-b border-ink-200/40 bg-paper/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandMark name={brandName} badge={brandBadge} />
          {nav.length > 0 && (
            <nav className="flex items-center gap-4 sm:gap-6">
              {nav.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-ink-500 transition-colors hover:text-forest-700"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
        <div className={cn('w-full', maxWidth === 'md' ? 'max-w-md' : 'max-w-sm')}>
          {children}
        </div>
      </main>
    </div>
  )
}

export function AuthCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-x-hidden rounded-2xl border border-ink-200/40 bg-white/70 p-5 shadow-soft backdrop-blur-sm sm:p-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

function AuthAtmosphere() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -left-[15%] -top-[10%] h-[60vh] w-[60vh] rounded-full opacity-[0.08] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #d4b8a3 0%, transparent 70%)' }}
        />
        <div
          className="absolute -right-[5%] top-[25%] h-[45vh] w-[45vh] rounded-full opacity-[0.06] blur-[90px]"
          style={{ background: 'radial-gradient(circle, #b9d3c4 0%, transparent 70%)' }}
        />
      </div>
    </>
  )
}
