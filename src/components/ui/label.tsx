import { LabelHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('label', className)} {...props} />
}

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
