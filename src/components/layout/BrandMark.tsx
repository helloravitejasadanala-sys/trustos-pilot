import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Product mark for auth/marketing surfaces.
 * Brand strings are injected by the page — never hardcoded here.
 */
export function BrandMark({
  name,
  badge,
  href = '/',
  className,
}: {
  name: string
  badge?: string
  href?: string
  className?: string
}) {
  return (
    <Link href={href} className={cn('flex items-center gap-2.5', className)}>
      <span className="font-display text-lg font-semibold tracking-tight text-forest-800">
        {name}
      </span>
      {badge ? (
        <span className="rounded-full border border-forest-200/60 bg-forest-50/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-forest-600">
          {badge}
        </span>
      ) : null}
    </Link>
  )
}
