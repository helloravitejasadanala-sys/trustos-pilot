'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-950 transition"
    >
      <ChevronLeft size={16} />
      {label}
    </Link>
  )
}
