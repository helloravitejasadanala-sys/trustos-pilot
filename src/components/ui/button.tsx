import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  accent: 'btn-accent',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-2 text-[13px]',
  md: '',
  lg: 'min-h-12 px-6 py-3.5',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = 'primary', size = 'md', fullWidth, type = 'button', ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(VARIANT[variant], SIZE[size], fullWidth && 'w-full', className)}
        {...props}
      />
    )
  },
)
