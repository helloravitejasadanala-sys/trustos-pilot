import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-card', className)} {...props} />
}

export function CardHover({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-card ui-card-hover', className)} {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-[var(--color-border)] px-4 py-2.5', className)} {...props} />
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 py-1', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]',
        className,
      )}
      {...props}
    />
  )
}
