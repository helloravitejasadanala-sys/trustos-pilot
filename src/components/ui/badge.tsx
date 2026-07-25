import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'info' | 'danger' | 'accent'

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-600',
  success: 'bg-sage-100 text-sage-700',
  warning: 'bg-amber-50 text-amber-700',
  info: 'bg-blue-50 text-blue-700',
  danger: 'bg-red-50 text-red-700',
  accent: 'bg-forest-50 text-forest-700',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip px-2.5 py-0.5 text-xs font-medium',
        TONE[tone],
        className,
      )}
      {...props}
    />
  )
}
