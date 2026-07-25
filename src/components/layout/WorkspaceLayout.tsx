import { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PageLayout, type PageWidth } from './PageLayout'

/**
 * Project workspace frame — Phase 1 canvas.
 */
export function WorkspaceLayout({
  children,
  className,
  width = 'default',
}: {
  children: ReactNode
  className?: string
  width?: PageWidth
}) {
  return (
    <PageLayout width={width} className={cn('min-w-0 px-0 py-2 md:py-5', className)}>
      {children}
    </PageLayout>
  )
}

/** Kept for callers; shell topbar already shows ‹ Projects in workspace. */
export function WorkspaceBreadcrumb({
  parentHref,
  parentLabel,
  current,
}: {
  parentHref: string
  parentLabel: string
  current: string
}) {
  return (
    <div className="mb-3 flex items-center gap-1.5 text-[13.5px] font-semibold text-[color:var(--muted)] md:hidden">
      <Link href={parentHref} className="hover:text-[color:var(--ink)]">
        ‹ {parentLabel}
      </Link>
      <span className="text-[color:var(--faint)]">/</span>
      <span className="max-w-[min(220px,50vw)] truncate text-[color:var(--ink)]">{current}</span>
    </div>
  )
}

export function WorkspaceTabs({
  tabs,
  active,
  onChange,
  badge,
  labelFor,
}: {
  tabs: readonly string[] | string[]
  active: string
  onChange: (tab: string) => void
  badge?: (tab: string) => string | null | undefined
  /** Optional display label (ids stay stable for logic). */
  labelFor?: (tab: string) => string
}) {
  return (
    <div
      className="mb-3 flex max-w-full flex-wrap gap-0.5 rounded-[9px] border p-0.5 md:mb-5"
      style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}
      role="tablist"
    >
      {tabs.map(t => {
        const badgeText = badge?.(t)
        const display = labelFor?.(t) || t
        const isActive = active === t
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t)}
            className={cn(
              'relative min-w-0 max-w-full shrink rounded-[6px] px-2.5 py-2 text-[12px] font-semibold transition-colors sm:px-3 sm:text-[12.5px]',
            )}
            style={
              isActive
                ? { background: 'var(--forest)', color: '#fff' }
                : { background: 'transparent', color: 'var(--muted)' }
            }
          >
            {display}
            {badgeText ? ` ${badgeText}` : ''}
          </button>
        )
      })}
    </div>
  )
}
