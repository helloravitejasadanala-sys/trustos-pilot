import { cn } from '@/lib/utils'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-ink-100', className)} />
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-5">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}
