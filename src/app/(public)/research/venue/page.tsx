'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/safe-json'

const CHALLENGES = [
  { value: 'Parking', label: 'Parking' },
  { value: 'Loading equipment', label: 'Load-in' },
  { value: 'Power supply', label: 'Power' },
  { value: 'Internet / mobile signal', label: 'Signal' },
  { value: 'Venue coordination', label: 'Venue team' },
  { value: 'Lighting', label: 'Lighting' },
  { value: 'Timing', label: 'Timing' },
  { value: 'Guest management', label: 'Guests' },
  { value: 'Access restrictions', label: 'Access' },
  { value: 'Other', label: 'Something else' },
] as const

const RATINGS = [
  { value: 1, label: 'Rough', caption: 'That sounds like a rough one.' },
  { value: 2, label: 'Hard work', caption: 'Hard work, then.' },
  { value: 3, label: 'Fine', caption: 'Fine — nothing dramatic.' },
  { value: 4, label: 'Good', caption: 'Good to hear.' },
  { value: 5, label: 'Great', caption: 'Sounds like a great one.' },
] as const

const RETURN_CHOICES = ['Definitely', 'Maybe', 'No'] as const

const PROGRESS_NOTES = [
  'Five quick questions',
  'Four to go',
  'Halfway',
  'Nearly there',
  'Last one',
] as const

const ADVICE_LIMIT = 250
const TOTAL_STEPS = 5

type FormState = {
  venue: string
  challenge: string
  rating: number | null
  advice: string
  wouldReturn: string
}

const EMPTY: FormState = {
  venue: '',
  challenge: '',
  rating: null,
  advice: '',
  wouldReturn: '',
}

export default function VenueResearchFormPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const ratingMeta = useMemo(
    () => RATINGS.find(r => r.value === form.rating) || null,
    [form.rating],
  )
  const challengeLabel =
    CHALLENGES.find(c => c.value === form.challenge)?.label || form.challenge

  function validateStep(n: number): string | null {
    if (n === 1 && form.venue.trim().length < 2) return 'Add a venue name and we’ll carry on.'
    if (n === 2 && !form.challenge) return 'Pick the one that cost you the most time.'
    if (n === 3 && form.rating === null) return 'Tap a rating to continue.'
    if (n === 4 && form.advice.length > ADVICE_LIMIT) return 'Trim this to 250 characters.'
    if (n === 5 && !form.wouldReturn) return 'One last tap and you’re done.'
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
          challenge: form.challenge,
          rating: form.rating,
          advice: form.advice.trim() || undefined,
          wouldReturn: form.wouldReturn,
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

  const primaryLabel =
    step === TOTAL_STEPS
      ? submitting
        ? 'Sending…'
        : 'Send'
      : step === 4 && !form.advice.trim()
        ? 'Skip'
        : 'Continue'

  return (
    <main className="min-h-screen bg-sand-50 px-4 pb-28 pt-10 text-ink-900">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="text-[13px] text-ink-400 hover:text-ink-700">
          ← TrustOS
        </Link>

        <header className={`mt-4 ${step > 1 ? '' : 'mb-1'}`}>
          <h1
            className="serif tracking-tight text-ink-900"
            style={{ fontSize: step > 1 ? 16 : 'clamp(28px, 7vw, 34px)', lineHeight: 1.15 }}
          >
            Venue experience
          </h1>
          {step === 1 && (
            <div className="mt-3">
              <p className="max-w-[30ch] text-[15px] leading-relaxed text-ink-500">
                Under a minute. Real notes from people who work at event venues.
              </p>
              <p className="mt-2 text-[13px] text-ink-400">Anonymous · No account</p>
            </div>
          )}
        </header>

        {!done && (
          <div className="mb-5 mt-5" aria-hidden={done}>
            <div className="grid grid-cols-5 gap-1.5">
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
            <p className="serif text-[26px] leading-tight text-ink-900">Thank you.</p>
            <p className="mt-2 text-[14px] text-ink-500">
              Your note is saved for the TrustOS research archive.
            </p>
            <dl className="mt-5 space-y-2.5 rounded-xl bg-sand-50 px-4 py-3 text-[13.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Venue</dt>
                <dd className="text-right font-medium text-ink-900">{form.venue.trim()}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Hardest part</dt>
                <dd className="text-right font-medium text-ink-900">{challengeLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Overall</dt>
                <dd className="text-right font-medium text-ink-900">
                  {ratingMeta ? `${ratingMeta.label} (${form.rating}/5)` : form.rating}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Back again</dt>
                <dd className="text-right font-medium text-ink-900">{form.wouldReturn}</dd>
              </div>
            </dl>
            {form.advice.trim() ? (
              <p className="mt-4 border-l-2 border-forest-200 pl-3 text-[14px] italic text-ink-600">
                “{form.advice.trim()}”
              </p>
            ) : null}
            <button type="button" className="btn btn-ghost mt-6 w-full" onClick={reset}>
              Add another venue
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm sm:p-6">
            {step > 1 && form.venue.trim() && (
              <div className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-neutral-200 bg-sand-50 px-3 py-1.5 text-[12.5px] font-medium text-ink-500">
                <span className="truncate">{form.venue.trim()}</span>
              </div>
            )}

            {step === 1 && (
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="serif text-[22px] leading-snug text-ink-900">
                  Where were you working?
                </legend>
                <p className="mt-2 text-[13.5px] text-ink-500">Venue name is enough.</p>
                <label className="label mt-5" htmlFor="venue">
                  Venue
                </label>
                <input
                  id="venue"
                  className="w-full text-base"
                  value={form.venue}
                  onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                  placeholder="Venue name"
                  autoComplete="off"
                  enterKeyHint="next"
                  autoFocus
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
                  What made it harder than it needed to be?
                </legend>
                <p className="mt-2 text-[13.5px] text-ink-500">Pick the one that cost the most time.</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {CHALLENGES.map(c => {
                    const active = form.challenge === c.value
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, challenge: c.value }))
                          setError('')
                        }}
                        className={`min-h-[48px] rounded-xl border px-3 py-3 text-left text-[14px] font-medium transition ${
                          active
                            ? 'border-forest-700 bg-forest-50 text-forest-950'
                            : 'border-neutral-200 bg-white text-ink-800 hover:bg-sand-50'
                        }`}
                      >
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )}

            {step === 3 && (
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="serif text-[22px] leading-snug text-ink-900">
                  How did the day feel overall?
                </legend>
                <p className="mt-2 text-[13.5px] text-ink-500">One tap.</p>
                <div className="mt-5 grid grid-cols-5 gap-2">
                  {RATINGS.map(r => {
                    const active = form.rating === r.value
                    return (
                      <button
                        key={r.value}
                        type="button"
                        aria-label={`${r.value} of 5 — ${r.label}`}
                        onClick={() => {
                          setForm(f => ({ ...f, rating: r.value }))
                          setError('')
                        }}
                        className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border px-1 py-2 transition ${
                          active
                            ? 'border-forest-700 bg-forest-50'
                            : 'border-neutral-200 bg-white hover:bg-sand-50'
                        }`}
                      >
                        <span className="text-[13px] font-semibold text-ink-900">{r.value}</span>
                        <span className="mt-0.5 text-center text-[10px] leading-tight text-ink-500">
                          {r.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {ratingMeta && (
                  <p className="mt-3 text-[13.5px] text-ink-500" aria-live="polite">
                    {ratingMeta.caption}
                  </p>
                )}
              </fieldset>
            )}

            {step === 4 && (
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="serif text-[22px] leading-snug text-ink-900">
                  What should the next person know?
                </legend>
                <p className="mt-2 text-[13.5px] text-ink-500">Optional — skip if nothing to add.</p>
                <label className="label mt-5" htmlFor="advice">
                  Tip for the next professional
                </label>
                <textarea
                  id="advice"
                  className="w-full text-base"
                  rows={4}
                  maxLength={ADVICE_LIMIT}
                  value={form.advice}
                  onChange={e => setForm(f => ({ ...f, advice: e.target.value }))}
                  placeholder="Load in from the rear gate — the main door has a step and no ramp."
                  autoFocus
                />
                <p className="mt-1.5 text-right text-[12px] text-ink-400">
                  {form.advice.length}/{ADVICE_LIMIT}
                </p>
              </fieldset>
            )}

            {step === 5 && (
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="serif text-[22px] leading-snug text-ink-900">
                  Would you go back?
                </legend>
                <p className="mt-2 text-[13.5px] text-ink-500">Last question.</p>
                <div className="mt-5 space-y-2">
                  {RETURN_CHOICES.map(choice => {
                    const active = form.wouldReturn === choice
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, wouldReturn: choice }))
                          setError('')
                        }}
                        className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition ${
                          active
                            ? 'border-forest-700 bg-forest-50 text-forest-950'
                            : 'border-neutral-200 bg-white text-ink-800 hover:bg-sand-50'
                        }`}
                      >
                        <span
                          className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                            active ? 'border-forest-700 bg-forest-700' : 'border-neutral-300'
                          }`}
                          aria-hidden
                        />
                        {choice}
                      </button>
                    )
                  })}
                </div>
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
              {primaryLabel}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
