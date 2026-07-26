'use client'

import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { parseJsonResponse } from '@/lib/safe-json'

type Note = {
  id: string
  access: string | null
  power: string | null
  internet: string | null
  lighting: string | null
  restrictions: string | null
  confidence: number | null
  createdAt: string
}

type LookupOk = {
  match: true
  venue: { id: string; name: string; city: string }
  note: Note | null
  earlierCount: number
}

const FIELDS: { key: keyof Note; label: string }[] = [
  { key: 'access', label: 'Access' },
  { key: 'power', label: 'Power' },
  { key: 'internet', label: 'Internet' },
  { key: 'lighting', label: 'Lighting' },
  { key: 'restrictions', label: 'Restrictions' },
]

/**
 * Surfaces the most recent venue note for a location (lookup on parent blur).
 * Renders nothing when there is no match or the venue has no note.
 *
 * City: always sent as a query string ("" when unknown) so lookup hits the same
 * unique key as POST (vendorId + nameKey + city), both via normalizeCity().
 */
export default function VenueMemoryPanel({
  location,
  city = '',
  variant = 'panel',
}: {
  /** Value to look up — parent should set this on blur, not every keystroke. */
  location: string
  city?: string
  variant?: 'panel' | 'modal'
}) {
  const [payload, setPayload] = useState<LookupOk | null>(null)

  useEffect(() => {
    const loc = location.trim()
    if (!loc) {
      setPayload(null)
      return
    }

    let cancelled = false
    ;(async () => {
      // Always include city= so the param is "" not absent/undefined string.
      const params = new URLSearchParams()
      params.set('location', loc)
      params.set('city', city ?? '')
      const res = await fetch(`/api/vendor/venues/lookup?${params.toString()}`)
      const json = await parseJsonResponse<{
        match?: boolean
        venue?: LookupOk['venue']
        note?: Note | null
        earlierCount?: number
      }>(res)
      if (cancelled) return
      if (!json.ok || !json.data.match || !json.data.note || !json.data.venue) {
        setPayload(null)
        return
      }
      setPayload({
        match: true,
        venue: json.data.venue,
        note: json.data.note,
        earlierCount: json.data.earlierCount ?? 0,
      })
    })()

    return () => { cancelled = true }
  }, [location, city])

  if (!payload?.note) return null

  const { venue, note, earlierCount } = payload
  const lines = FIELDS.map(({ key, label }) => {
    const v = typeof note[key] === 'string' ? (note[key] as string).trim() : ''
    return v ? { label, text: v } : null
  }).filter(Boolean) as { label: string; text: string }[]

  const shell =
    variant === 'modal'
      ? 'rounded-xl border border-forest-100 bg-forest-50/50 px-3.5 py-3'
      : 'panel'

  const shellStyle =
    variant === 'panel'
      ? { padding: 14, marginTop: 10 }
      : undefined

  return (
    <div className={shell} style={shellStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <MapPin size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <div style={{ font: 'var(--t-h2)', fontSize: 14 }}>
          You’ve worked here before
        </div>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)' }}>
        Your last notes for {venue.name}
        {venue.city ? ` · ${venue.city}` : ''}.
      </p>
      {lines.length > 0 || note.confidence != null ? (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
          {lines.map(line => (
            <li key={line.label} style={{ fontSize: 13, color: 'var(--ink)' }}>
              <span style={{ color: 'var(--muted)' }}>{line.label}: </span>
              {line.text}
            </li>
          ))}
          {note.confidence != null && (
            <li style={{ fontSize: 13, color: 'var(--ink)' }}>
              <span style={{ color: 'var(--muted)' }}>Confidence: </span>
              {note.confidence}/5
            </li>
          )}
        </ul>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>A note is saved for this venue.</p>
      )}
      {earlierCount > 0 && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          {earlierCount === 1 ? '1 earlier note' : `${earlierCount} earlier notes`}
        </p>
      )}
    </div>
  )
}
