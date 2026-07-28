'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Consistent vendor back control — large tap target, same look as the
 * mobile workspace bar.
 */
export default function BackLink({
  href,
  label,
  className,
}: {
  href: string
  label: string
  className?: string
}) {
  return (
    <Link href={href} className={cn('vendor-back', className)}>
      <span aria-hidden>‹</span>
      {label}
    </Link>
  )
}
