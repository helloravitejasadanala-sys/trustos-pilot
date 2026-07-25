import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PageWidth = 'default' | 'narrow' | 'wide'

const WIDTH: Record<PageWidth, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-5xl',
  wide: 'max-w-6xl',
}

/**
 * Standard content frame for Vendor Dashboard surfaces
 * (Today, Projects, Clients, Settings, Empty States).
 */
export function PageLayout({
  children,
  width = 'default',
  className,
}: {
  children: ReactNode
  width?: PageWidth
  className?: string
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-5 md:px-6 md:py-6',
        WIDTH[width],
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 border-b pb-4 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className,
      )}
      style={{ borderColor: 'var(--line)' }}
    >
      <div className="min-w-0">
        <h1 className="serif text-[22px] leading-tight text-[color:var(--ink)] sm:text-[25px]">{title}</h1>
        {description ? (
          <p className="mt-0.5 text-[13px] text-[color:var(--muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
