'use client'

import { useState } from 'react'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/safe-json'

/** Who was on site — filter intel per trade later. */
const ROLES = [
  { value: 'PHOTOGRAPHY', label: 'Photographer' },
  { value: 'LIVE_STREAMING', label: 'Live stream' },
  { value: 'DJ', label: 'DJ' },
  { value: 'MAKEUP_ARTIST', label: 'Makeup' },
  { value: 'DECOR', label: 'Decor' },
  { value: 'EVENT_PLANNER', label: 'Planner' },
  { value: 'OTHER', label: 'Other' },
] as const

/** Real problems the next vendor needs to know. */
const ISSUES = [
  { value: 'Parking / drop-off', label: 'Parking' },
  { value: 'Load-in / access', label: 'Load-in' },
  { value: 'Power', label: 'Power' },
  { value: 'Internet / mobile signal', label: 'Signal' },
  { value: 'Lighting', label: 'Lighting' },
  { value: 'Noise / quiet space', label: 'Noise' },
  { value: 'Venue staff / coordination', label: 'Venue team' },
  { value: 'Timing / run of show', label: 'Timing' },
  { value: 'Restrictions (rules)', label: 'Rules' },
  { value: 'Space / staging', label: 'Space' },
  { value: 'Other', label: 'Other' },
] as const

const PROGRESS_NOTES = [
  'Three quick steps',
  'Almost done',
  'Last — the useful bit',
] as const

const TIP_LIMIT = 200
const TIP_MIN = 12
const MAX_ISSUES = 3
const TOTAL_STEPS = 3

type FormState = {
  venue: string
  city: string
  role: string
  issues: string[]
  tip: string
}

const EMPTY: FormState = {
  venue: '',
  city: '',
  role: '',
  issues: [],
  tip: '',
}

export default function VenueResearchFormPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const roleLabel = ROLES.find(r => r.value === form.role)?.label || form.role

  function toggleIssue(value: string) {
    setForm(f => {
      if (f.issues.includes(value)) {
        return { ...f, issues: f.issues.filter(i => i !== value) }
      }
      if (f.issues.length >= MAX_ISSUES) return f
      return { ...f, issues: [...f.issues, value] }
    })
    setError('')
  }

  function validateStep(n: number): string | null {
    if (n === 1) {
      if (form.venue.trim().length < 2) return 'Add the venue name.'
      if (form.city.trim().length < 2) return 'Add the UK town or city.'
    }
    if (n === 2 && !form.role) return 'Tap what you do.'
    if (n === 2 && form.issues.length === 0) return 'Tap at least one real issue.'
    if (n === 3) {
      const tip = form.tip.trim()
      if (tip.length < TIP_MIN) {
        return 'Add one concrete tip (gate, power, ban, quiet room…).'
      }
      if (tip.length > TIP_LIMIT) return `Keep the tip under ${TIP_LIMIT} characters.`
    }
    return null
  }

  async function submit() {
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
              That tip is now in the TrustOS research archive for this venue.
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
            <p className="mt-4 border-l-2 border-forest-200 pl-3 text-[14px] italic text-ink-600">
              “{form.tip.trim()}”
            </p>
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
                  What went wrong on site?
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
                        onClick={() => toggleIssue(issue.value)}
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
                  One tip for the next vendor
                </legend>
                <p className="mt-2 text-[13.5px] text-ink-500">
                  Required. Be specific — this is the data that helps them grow.
                </p>
                <label className="label mt-5" htmlFor="tip">
                  Tip
                </label>
                <textarea
                  id="tip"
                  className="w-full text-base"
                  rows={3}
                  maxLength={TIP_LIMIT}
                  value={form.tip}
                  onChange={e => setForm(f => ({ ...f, tip: e.target.value }))}
                  placeholder="e.g. Load in via rear gate — main door has a step, no ramp. Power is behind the bar."
                  autoFocus
                />
                <p className="mt-1.5 text-right text-[12px] text-ink-400">
                  {form.tip.length}/{TIP_LIMIT}
                </p>
              </fieldset>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
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
              {step === TOTAL_STEPS ? (submitting ? 'Sending…' : 'Send tip') : 'Continue'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
