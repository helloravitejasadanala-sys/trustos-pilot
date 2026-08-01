'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/safe-json'
import {
  firstPersonLikeField,
  PLACES_NOT_PEOPLE_REASON,
} from '@/lib/venue-research-guard'

/** Who was on site — filter intel per trade later. */
const ROLES = [
  { value: 'PHOTOGRAPHY', label: 'Photographer' },
  { value: 'LIVE_STREAMING', label: 'Live stream' },
  { value: 'DJ', label: 'DJ' },
  { value: 'MAKEUP_ARTIST', label: 'Makeup' },
  { value: 'PHOTO_EDITOR', label: 'Photo editor' },
  { value: 'VIDEO_EDITOR', label: 'Video editor' },
  { value: 'DECOR', label: 'Decor' },
  { value: 'EVENT_PLANNER', label: 'Planner' },
  { value: 'OTHER', label: 'Other' },
] as const

/** Place-shaped issues — no “venue team / staff” (invites naming people). */
const ISSUES = [
  { value: 'Parking / drop-off', label: 'Parking', focus: null },
  { value: 'Load-in / access', label: 'Load-in', focus: 'access' as const },
  { value: 'Power', label: 'Power', focus: 'power' as const },
  { value: 'Internet / mobile signal', label: 'Signal', focus: 'internet' as const },
  { value: 'Lighting', label: 'Lighting', focus: 'lighting' as const },
  { value: 'Noise / quiet space', label: 'Noise', focus: null },
  { value: 'Timing / run of show', label: 'Timing', focus: null },
  { value: 'Restrictions (rules)', label: 'Rules', focus: 'restrictions' as const },
  { value: 'Space / staging', label: 'Space', focus: null },
  { value: 'Other', label: 'Other', focus: null },
] as const

const INTEL_FIELDS = [
  { key: 'access' as const, label: 'Access', placeholder: 'Side gate, locked after 6pm' },
  { key: 'power' as const, label: 'Power', placeholder: 'One socket by the stage' },
  { key: 'internet' as const, label: 'Internet', placeholder: 'No signal in the basement' },
  { key: 'lighting' as const, label: 'Lighting', placeholder: 'East room goes dark by 4pm' },
  { key: 'restrictions' as const, label: 'Restrictions', placeholder: 'No drone, no confetti' },
]

const PLACES_BANNER =
  'Write about the place, not the people. No names, no “the manager”, no staff — only rooms, doors, power, signal, rules.'

const PROGRESS_NOTES = [
  'Three quick steps',
  'Almost done',
  'Last — the useful bit',
] as const

const TIP_LIMIT = 200
const INTEL_LIMIT = 120
const MAX_ISSUES = 3
const TOTAL_STEPS = 3

type IntelKey = (typeof INTEL_FIELDS)[number]['key']

type FormState = {
  venue: string
  city: string
  role: string
  issues: string[]
  access: string
  power: string
  internet: string
  lighting: string
  restrictions: string
  tip: string
}

const EMPTY: FormState = {
  venue: '',
  city: '',
  role: '',
  issues: [],
  access: '',
  power: '',
  internet: '',
  lighting: '',
  restrictions: '',
  tip: '',
}

export default function VenueResearchFormPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [focusField, setFocusField] = useState<IntelKey | null>(null)

  const roleLabel = ROLES.find(r => r.value === form.role)?.label || form.role

  const highlighted = useMemo(() => {
    const keys = new Set<IntelKey>()
    for (const issue of ISSUES) {
      if (form.issues.includes(issue.value) && issue.focus) keys.add(issue.focus)
    }
    return keys
  }, [form.issues])

  function toggleIssue(value: string, focus: IntelKey | null) {
    setForm(f => {
      if (f.issues.includes(value)) {
        return { ...f, issues: f.issues.filter(i => i !== value) }
      }
      if (f.issues.length >= MAX_ISSUES) return f
      return { ...f, issues: [...f.issues, value] }
    })
    if (focus) setFocusField(focus)
    setError('')
  }

  function personBlockReason(): string | null {
    const hit = firstPersonLikeField({
      access: form.access,
      power: form.power,
      internet: form.internet,
      lighting: form.lighting,
      restrictions: form.restrictions,
      tip: form.tip,
    })
    return hit ? PLACES_NOT_PEOPLE_REASON : null
  }

  function validateStep(n: number): string | null {
    if (n === 1) {
      if (form.venue.trim().length < 2) return 'Add the venue name.'
      if (form.city.trim().length < 2) return 'Add the UK town or city.'
    }
    if (n === 2 && !form.role) return 'Tap what you do.'
    if (n === 2 && form.issues.length === 0) return 'Tap at least one real issue.'
    if (n === 3) {
      if (form.tip.trim().length > TIP_LIMIT) {
        return `Keep the tip under ${TIP_LIMIT} characters.`
      }
      for (const f of INTEL_FIELDS) {
        if (form[f.key].trim().length > INTEL_LIMIT) {
          return `Keep ${f.label.toLowerCase()} under ${INTEL_LIMIT} characters.`
        }
      }
      const person = personBlockReason()
      if (person) return person
    }
    return null
  }

  async function submit() {
    const person = personBlockReason()
    if (person) {
      setError(person)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/research/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'venue_experience',
          mode: 'experience',
          venueName: form.venue.trim(),
          city: form.city.trim(),
          country: 'United Kingdom',
          role: form.role,
          issues: form.issues,
          access: form.access.trim(),
          power: form.power.trim(),
          internet: form.internet.trim(),
          lighting: form.lighting.trim(),
          restrictions: form.restrictions.trim(),
          advice: form.tip.trim(),
        }),
      })
      const parsed = await parseJsonResponse<{ error?: string }>(res)
      if (!parsed.ok) {
        setError(parsed.data.error || 'Could not submit — try again.')
        return
      }
      setDone(true)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function goNext() {
    const msg = validateStep(step)
    if (msg) {
      setError(msg)
      return
    }
    setError('')
    if (step < TOTAL_STEPS) setStep(s => s + 1)
    else void submit()
  }

  function goBack() {
    setError('')
    if (step > 1) setStep(s => s - 1)
  }

  function reset() {
    setForm(EMPTY)
    setStep(1)
    setError('')
    setDone(false)
    setFocusField(null)
  }

  return (
    <main className="min-h-screen bg-sand-50 px-4 pb-28 pt-10 text-ink-900">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="text-[13px] text-ink-400 hover:text-ink-700">
          ← TrustOS
        </Link>

        <header className="mt-4">
          <h1
            className="serif tracking-tight text-ink-900"
            style={{ fontSize: step > 1 ? 16 : 'clamp(28px, 7vw, 34px)', lineHeight: 1.15 }}
          >
            Venue notes
          </h1>
          {step === 1 && (
            <div className="mt-3">
              <p className="max-w-[34ch] text-[15px] leading-relaxed text-ink-500">
                UK venues only. Under a minute. Your note helps the next photographer, DJ, streamer, or planner on site.
              </p>
              <p className="mt-2 text-[13px] text-ink-400">Anonymous · No email · No Google Maps</p>
            </div>
          )}
        </header>

        {!done && (
          <div
            className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-3 text-[13px] leading-snug text-ink-800"
            role="note"
          >
            {PLACES_BANNER}
          </div>
        )}

        {!done && (
          <div className="mb-5 mt-5">
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full ${
                    i < step - 1
                      ? 'bg-forest-700'
                      : i === step - 1
                        ? 'bg-forest-300'
                        : 'bg-neutral-200'
                  }`}
                />
              ))}
            </div>
            <p className="mt-2.5 text-[12.5px] text-ink-400">{PROGRESS_NOTES[step - 1]}</p>
          </div>
        )}

        {done ? (
          <div className="mt-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
            <p className="serif text-[26px] leading-tight text-ink-900">Saved — thank you.</p>
            <p className="mt-2 text-[14px] text-ink-500">
              Saved to the research archive. Tips about places help the next vendor; we don&apos;t keep notes about people.
            </p>
            <dl className="mt-5 space-y-2.5 rounded-xl bg-sand-50 px-4 py-3 text-[13.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Venue</dt>
                <dd className="text-right font-medium text-ink-900">
                  {form.venue.trim()}, {form.city.trim()}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Role</dt>
                <dd className="text-right font-medium text-ink-900">{roleLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Issues</dt>
                <dd className="text-right font-medium text-ink-900">{form.issues.join(', ')}</dd>
              </div>
            </dl>
            <button type="button" className="btn btn-ghost mt-6 w-full" onClick={reset}>
              Add another venue
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm sm:p-6">
            {step > 1 && form.venue.trim() && (
              <div className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-neutral-200 bg-sand-50 px-3 py-1.5 text-[12.5px] font-medium text-ink-500">
                <span className="truncate">
                  {form.venue.trim()}
                  {form.city.trim() ? ` · ${form.city.trim()}` : ''}
                </span>
              </div>
            )}

            {step === 1 && (
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="serif text-[22px] leading-snug text-ink-900">
                  Which UK venue?
                </legend>
                <p className="mt-2 text-[13.5px] text-ink-500">Both fields required.</p>
                <label className="label mt-5" htmlFor="venue">
                  Venue name
                </label>
                <input
                  id="venue"
                  className="w-full text-base"
                  value={form.venue}
                  onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                  placeholder="e.g. Warwick Castle"
                  autoComplete="off"
                  enterKeyHint="next"
                  autoFocus
                />
                <label className="label mt-4" htmlFor="city">
                  Town / city
                </label>
                <input
                  id="city"
                  className="w-full text-base"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Warwick"
                  autoComplete="address-level2"
                  enterKeyHint="next"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      goNext()
                    }
                  }}
                />
              </fieldset>
            )}

            {step === 2 && (
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="serif text-[22px] leading-snug text-ink-900">
                  What was rough on site?
                </legend>
                <p className="mt-2 text-[13.5px] text-ink-500">
                  Your role, then up to {MAX_ISSUES} issues — required.
                </p>

                <p className="label mt-5">I was there as</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ROLES.map(r => {
                    const active = form.role === r.value
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, role: r.value }))
                          setError('')
                        }}
                        className={`min-h-[44px] rounded-xl border px-3 py-2 text-[13.5px] font-medium ${
                          active
                            ? 'border-forest-700 bg-forest-50 text-forest-950'
                            : 'border-neutral-200 bg-white text-ink-800 hover:bg-sand-50'
                        }`}
                      >
                        {r.label}
                      </button>
                    )
                  })}
                </div>

                <p className="label mt-5">Warn the next vendor about</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {ISSUES.map(issue => {
                    const active = form.issues.includes(issue.value)
                    const full = !active && form.issues.length >= MAX_ISSUES
                    return (
                      <button
                        key={issue.value}
                        type="button"
                        disabled={full}
                        onClick={() => toggleIssue(issue.value, issue.focus)}
                        className={`min-h-[48px] rounded-xl border px-3 py-3 text-left text-[14px] font-medium transition disabled:opacity-40 ${
                          active
                            ? 'border-forest-700 bg-forest-50 text-forest-950'
                            : 'border-neutral-200 bg-white text-ink-800 hover:bg-sand-50'
                        }`}
                      >
                        {issue.label}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-[12px] text-ink-400">
                  {form.issues.length}/{MAX_ISSUES} selected
                </p>
              </fieldset>
            )}

            {step === 3 && (
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="serif text-[22px] leading-snug text-ink-900">
                  What should the next vendor know?
                </legend>
                <p className="mt-2 text-[13.5px] text-ink-500">
                  Optional shorts — fill what you remember. Skip the rest.
                </p>

                <div className="mt-5 space-y-3">
                  {INTEL_FIELDS.map(field => {
                    const hot = highlighted.has(field.key) || focusField === field.key
                    return (
                      <div key={field.key}>
                        <label className="label" htmlFor={field.key}>
                          {field.label}
                          {hot ? (
                            <span className="ml-1.5 text-[11px] font-semibold text-forest-700">
                              from your tags
                            </span>
                          ) : null}
                        </label>
                        <input
                          id={field.key}
                          className={`w-full text-base ${
                            hot ? 'border-forest-400 ring-1 ring-forest-200' : ''
                          }`}
                          maxLength={INTEL_LIMIT}
                          value={form[field.key]}
                          onChange={e => {
                            setForm(f => ({ ...f, [field.key]: e.target.value }))
                            setError('')
                          }}
                          placeholder={field.placeholder}
                          autoComplete="off"
                        />
                      </div>
                    )
                  })}
                </div>

                <label className="label mt-5" htmlFor="tip">
                  Anything else?
                </label>
                <textarea
                  id="tip"
                  className="w-full text-base"
                  rows={2}
                  maxLength={TIP_LIMIT}
                  value={form.tip}
                  onChange={e => {
                    setForm(f => ({ ...f, tip: e.target.value }))
                    setError('')
                  }}
                  placeholder="e.g. Dancefloor is under a low beam — tall kit won’t fit."
                />
                <p className="mt-1.5 text-[12.5px] text-ink-500">
                  Places only — skip names and staff.
                </p>
                <p className="mt-1 text-right text-[12px] text-ink-400">
                  {form.tip.length}/{TIP_LIMIT}
                </p>
              </fieldset>
            )}

            {error && (
              <div
                className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {!done && (
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-sand-50/95 px-4 pt-3 backdrop-blur"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex w-full max-w-md gap-2">
            {step > 1 ? (
              <button type="button" className="btn btn-ghost min-h-[48px] flex-1" onClick={goBack} disabled={submitting}>
                Back
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-forest min-h-[48px] flex-[1.4]"
              onClick={goNext}
              disabled={submitting}
            >
              {step === TOTAL_STEPS ? (submitting ? 'Sending…' : 'Submit') : 'Continue'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
