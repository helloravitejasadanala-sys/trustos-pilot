import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** When true, skips the global 44px min-height (e.g. compact search). */
  compact?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, compact, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn('ui-input', compact && '!min-h-0', className)}
        {...props}
      />
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn('ui-input', className)} {...props} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn('ui-input', className)} {...props} />
  },
)
