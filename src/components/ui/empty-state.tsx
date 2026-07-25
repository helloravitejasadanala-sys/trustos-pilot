import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('ui-empty-state empty text-center', className)}>
      {icon && (
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-[color:var(--faint)]">
          {icon}
        </div>
      )}
      <p className="font-semibold text-[color:var(--ink)]" style={{ font: 'var(--t-h2)' }}>{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-[color:var(--muted)]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Bordered welcome / first-run empty panel used on dashboard surfaces. */
export function EmptyPanel({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mx-auto max-w-lg rounded-xl border border-forest-200 bg-white px-6 py-10 text-center',
        className,
      )}
    >
      <h2 className="font-display text-2xl text-forest-950">{title}</h2>
      {description && (
        <p className="mt-2 text-[14px] text-forest-600">{description}</p>
      )}
      {children}
    </div>
  )
}
