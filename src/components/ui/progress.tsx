import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Progress({
  value,
  max = 100,
  className,
  trackClassName,
  barClassName,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  value: number
  max?: number
  trackClassName?: string
  barClassName?: string
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('h-1.5 overflow-hidden rounded-full bg-ink-100', trackClassName, className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full bg-forest-500 transition-all', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function ProgressLabeled({
  label,
  valueLabel,
  value,
  max = 100,
  className,
}: {
  label?: string
  valueLabel?: string
  value: number
  max?: number
  className?: string
}) {
  return (
    <div className={cn(className)}>
      {(label || valueLabel) && (
        <div className="mb-1.5 flex justify-between text-xs text-forest-500">
          {label ? <span>{label}</span> : <span />}
          {valueLabel ? <span>{valueLabel}</span> : null}
        </div>
      )}
      <Progress value={value} max={max} />
    </div>
  )
}
