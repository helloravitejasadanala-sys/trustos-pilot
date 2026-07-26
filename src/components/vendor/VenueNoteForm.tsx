'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { CheckCircle, ChevronDown, ChevronUp, Loader2, MapPin, Send } from 'lucide-react'
import { parseJsonResponse } from '@/lib/safe-json'

type NoteFields = {
  access: string
  power: string
  internet: string
  lighting: string
  restrictions: string
  confidence: number | null
}

type SavedNote = {
  id: string
  access: string | null
  power: string | null
  internet: string | null
  lighting: string | null
  restrictions: string | null
  confidence: number | null
  source: string
  createdAt: string
}

const FIELD_META: { key: keyof Omit<NoteFields, 'confidence'>; label: string; placeholder: string }[] = [
  { key: 'access', label: 'Access', placeholder: 'Loading bay, parking, check-in…' },
  { key: 'power', label: 'Power', placeholder: 'Sockets near stage, need extension…' },
  { key: 'internet', label: 'Internet', placeholder: 'Guest Wi‑Fi, bring hotspot…' },
  { key: 'lighting', label: 'Lighting', placeholder: 'Dim reception, window light only…' },
  { key: 'restrictions', label: 'Restrictions', placeholder: 'No drones, quiet hours, tape rules…' },
]

const emptyFields = (): NoteFields => ({
  access: '',
  power: '',
  internet: '',
  lighting: '',
  restrictions: '',
  confidence: null,
})

function noteSummary(note: SavedNote): string[] {
  return FIELD_META.map(({ key, label }) => {
    const v = note[key]?.trim()
    return v ? `${label}: ${v}` : null
  }).filter(Boolean) as string[]
}

export default function VenueNoteForm({
  projectId,
  location,
}: {
  projectId: string
  location: string | null | undefined
}) {
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState<SavedNote | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [fields, setFields] = useState<NoteFields>(emptyFields)
  const [saving, setSaving] = useState(false)

  const hasLocation = !!location?.trim()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await fetch(`/api/vendor/projects/${projectId}/venue-note`)
      const json = await parseJsonResponse<{ note?: SavedNote | null; error?: string }>(res)
      if (cancelled) return
      if (json.ok && json.data.note) {
        setSaved(json.data.note)
        setExpanded(false)
      } else {
        setSaved(null)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [projectId])

  async function handleSave() {
    const filled = FIELD_META.some(({ key }) => fields[key].trim()) || fields.confidence != null
    if (!filled) {
      toast.error('Add at least one venue detail before saving.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/vendor/projects/${projectId}/venue-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location?.trim(),
          access: fields.access,
          power: fields.power,
          internet: fields.internet,
          lighting: fields.lighting,
          restrictions: fields.restrictions,
          confidence: fields.confidence,
        }),
      })
      const json = await parseJsonResponse<{ note?: SavedNote; error?: string }>(res)
      if (!json.ok || !json.data.note) {
        throw new Error(json.data?.error || json.error || 'Could not save')
      }
      setSaved(json.data.note)
      setExpanded(false)
      toast.success('Venue note saved for next time')
    } catch (e: any) {
      toast.error(e.message || 'Could not save — try again')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="panel" style={{ padding: 16, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          <Loader2 size={14} className="animate-spin" />
          Checking venue note…
        </div>
      </div>
    )
  }

  if (!hasLocation) {
    return (
      <div className="panel" style={{ padding: 16, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <MapPin size={15} style={{ color: 'var(--muted)' }} />
          <div style={{ font: 'var(--t-h2)', fontSize: 15 }}>Venue note</div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          Add a venue name on Prep first, then you can save what you learned for the next booking here.
        </p>
      </div>
    )
  }

  if (saved) {
    const lines = noteSummary(saved)
    return (
      <div className="panel" style={{ padding: 16, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={16} style={{ color: 'var(--forest, #2f5d50)' }} />
            <div>
              <div style={{ font: 'var(--t-h2)', fontSize: 15 }}>Venue note · Saved</div>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
                Your notes for {location.trim()} — shown when you book here again.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minHeight: 36, fontSize: 12.5 }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? <>Hide <ChevronUp size={14} /></> : <>View <ChevronDown size={14} /></>}
          </button>
        </div>
        {expanded && (
          <div style={{ marginTop: 14, displayTop: '1px solid var(--line-soft)', paddingTop: 12 }}>
            {lines.length === 0 && saved.confidence == null ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>No details recorded.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                {lines.map(line => (
                  <li key={line} style={{ fontSize: 13, color: 'var(--ink)' }}>{line}</li>
                ))}
                {saved.confidence != null && (
                  <li style={{ fontSize: 13, color: 'var(--ink)' }}>Confidence: {saved.confidence}/5</li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    )
  }

  if (!expanded) {
    return (
      <div className="panel" style={{ padding: 16, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={15} style={{ color: 'var(--muted)' }} />
              <div style={{ font: 'var(--t-h2)', fontSize: 15 }}>Venue note</div>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
              Optional — capture what you want to remember about {location.trim()} for your next visit.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minHeight: 36, fontSize: 12.5, flexShrink: 0 }}
            onClick={() => setExpanded(true)}
          >
            Add note <ChevronDown size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="panel" style={{ padding: 18, marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={15} style={{ color: 'var(--muted)' }} />
          <div style={{ font: 'var(--t-h2)', fontSize: 15 }}>Venue note</div>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ minHeight: 36, fontSize: 12.5 }}
          onClick={() => setExpanded(false)}
        >
          Collapse <ChevronUp size={14} />
        </button>
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--muted)' }}>
        For your own memory on the next booking at this venue. Skip anytime.
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        {FIELD_META.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <textarea
              value={fields[key]}
              onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              rows={2}
            />
          </div>
        ))}
        <div>
          <label className="label">Confidence (1–5)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                className="btn btn-ghost"
                style={{
                  minHeight: 40,
                  minWidth: 40,
                  padding: 0,
                  borderColor: fields.confidence === n ? 'var(--forest, #2f5d50)' : undefined,
                  background: fields.confidence === n ? 'var(--lime-soft, #eef6e8)' : undefined,
                }}
                onClick={() => setFields(f => ({ ...f, confidence: f.confidence === n ? null : n }))}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-forest"
        style={{ marginTop: 16 }}
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        <span style={{ marginLeft: 8 }}>Save venue note</span>
      </button>
    </div>
  )
}
