'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle, Circle, HelpCircle, ArrowLeft } from 'lucide-react'
import { parseJsonResponse } from '@/lib/safe-json'
import { BASE_DETAIL_FIELDS, detailQuestionsFor, sectionLabelFor, type DetailField } from '@/lib/project-types'

/**
 * Stage 5 — "Your Journey". Same data flow as Stage 3/4 (every fetch
 * derives the project from the secure session; no identifier from the
 * browser). Only the presentation changed: a guided vertical timeline,
 * a clear next action with who-acts and estimated time, and payment
 * status — never a generic "dashboard".
 */

type Data = { project: any; questionnaire: any; proposal: any; contract: any; payment: any }

const STEPS = [
  { key: 'questionnaire', label: 'Confirm your project details', time: '3 minutes', who: 'You' },
  { key: 'proposal', label: 'Review and accept your proposal', time: '3 minutes', who: 'You' },
  { key: 'contract', label: 'Review and sign your agreement', time: '5 minutes', who: 'You' },
  { key: 'payment', label: 'Pay your deposit', time: '2 minutes', who: 'You' },
] as const

export default function ClientJourney({ params }: { params: { token: string } }) {
  const [state, setState] = useState<'loading' | 'invalid' | 'ready'>('loading')
  const [d, setD] = useState<Data | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const [project, questionnaire, proposal, contract, payment] = await Promise.all([
      fetch('/api/client/project').then(r => parseJsonResponse(r)),
      fetch('/api/client/questionnaire').then(r => parseJsonResponse(r)),
      fetch('/api/client/proposal').then(r => parseJsonResponse(r)),
      fetch('/api/client/contract').then(r => parseJsonResponse(r)),
      fetch('/api/client/payment').then(r => parseJsonResponse(r)),
    ])
    if (!project.ok) { setState('invalid'); return }
    setD({
      project: (project.data as any).project,
      questionnaire: questionnaire.ok ? (questionnaire.data as any).questionnaire ?? null : null,
      proposal: proposal.ok ? (proposal.data as any).proposal ?? null : null,
      contract: contract.ok ? (contract.data as any).contract ?? null : null,
      payment: payment.ok ? (payment.data as any).payment ?? null : null,
    })
    setState('ready')
  }

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/client/invite/${params.token}`, { method: 'POST' })
      const parsed = await parseJsonResponse(res)
      if (!parsed.ok) { setState('invalid'); return }
      await refresh()
    })()
  }, [params.token])

  if (state === 'loading') return (
    <Centre>
      <div className="w-full max-w-xl space-y-3">
        <div className="h-6 w-1/2 bg-ink-100 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-ink-100 rounded animate-pulse" />
        <div className="h-40 w-full bg-ink-100 rounded-2xl animate-pulse mt-6" />
      </div>
    </Centre>
  )

  if (state === 'invalid' || !d) return (
    <Centre>
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-medium text-forest-950">This link isn’t valid</h1>
        <p className="text-forest-700 mt-3">It may have expired or been replaced. Ask your vendor for a new link.</p>
      </div>
    </Centre>
  )

  const { project, questionnaire, proposal, contract, payment } = d
  const done = {
    questionnaire: !!questionnaire?.completedAt,
    proposal: !!proposal?.acceptedAt,
    contract: !!contract?.signedAt,
    // Paid when the balance is settled, a deposit has cleared, or there is
    // nothing to pay (free collaboration → total 0 → fullyPaid).
    payment: !!payment && (payment.fullyPaid || Number(payment.depositPaid) > 0),
  }
  let current: typeof STEPS[number]['key'] | 'done' = 'done'
  if (!done.questionnaire) current = 'questionnaire'
  else if (proposal && !done.proposal) current = 'proposal'
  else if (contract && !done.contract) current = 'contract'
  else if (payment && !done.payment) current = 'payment'

  const completedCount = Object.values(done).filter(Boolean).length
  const currentStep = STEPS.find(s => s.key === current)

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-xl mx-auto px-5 py-10 sm:py-14">
        <Link href="/" aria-label="Back to home" className="inline-flex items-center gap-1 text-sm text-forest-500 hover:text-forest-800 transition mb-6">
          <ArrowLeft size={15} /> TrustOS
        </Link>
        {/* Welcome */}
        <p className="text-sm text-forest-600">{project.vendor.businessName}</p>
        <h1 className="font-display text-4xl text-forest-950 mt-1 tracking-tight">
          Welcome{project.client?.name ? `, ${project.client.name.split(' ')[0]}` : ''}.
        </h1>
        <p className="text-forest-700 mt-2 leading-relaxed">
          {project.vendor.businessName} has invited you to your {project.title.replace(/\s*\(demo\)/i, '')}.
        </p>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-forest-500 mb-1.5">
            <span>Your progress</span>
            <span>{completedCount} of {STEPS.length}</span>
          </div>
          <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
            <div className="h-full bg-forest-500 rounded-full transition-all" style={{ width: `${(completedCount / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {/* Next step — the client's single clear action, matching the
            vendor's "Today's Action". One thing, no hunting. */}
        {current !== 'done' && currentStep && (
          <div className="mt-6 rounded-2xl bg-forest-950 text-paper-50 p-6">
            <p className="text-xs uppercase tracking-widest text-forest-300">Your next step</p>
            <p className="font-display text-xl mt-2 leading-snug">{currentStep.label}</p>
            <p className="text-sm text-forest-200 mt-1">Takes about {currentStep.time}. The step opens just below.</p>
          </div>
        )}

        {/* Vertical journey timeline (mobile-first) */}
        <ol className="mt-8 relative">
          {STEPS.map((s, i) => {
            const isDone = done[s.key]
            const isCurrent = s.key === current
            return (
              <li key={s.key} className="flex gap-3 pb-1">
                <div className="flex flex-col items-center">
                  {isDone
                    ? <CheckCircle size={20} className="text-forest-600" />
                    : <Circle size={20} className={isCurrent ? 'text-forest-950' : 'text-forest-300'} />}
                  {i < STEPS.length - 1 && <div className={`w-px flex-1 my-1 ${isDone ? 'bg-sage-300' : 'bg-ink-200'}`} />}
                </div>
                <div className={`pb-6 ${isCurrent ? '' : 'opacity-70'}`}>
                  <p className={isDone ? 'text-forest-500 text-sm' : isCurrent ? 'text-forest-950 font-medium' : 'text-forest-600 text-sm'}>{s.label}</p>
                  {isCurrent && (
                    <div className="mt-3">
                      {s.key === 'questionnaire' && <ProjectDetails project={project} existing={questionnaire?.answers} busy={busy} setBusy={setBusy} onDone={refresh} />}
                      {s.key === 'proposal' && <ProposalStep proposal={proposal} busy={busy} setBusy={setBusy} onDone={refresh} />}
                      {s.key === 'contract' && <ContractStep contract={contract} busy={busy} setBusy={setBusy} onDone={refresh} />}
                      {s.key === 'payment' && <PaymentStep payment={payment} busy={busy} setBusy={setBusy} onDone={refresh} />}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        {/* Payment status summary */}
        {payment && (done.contract || done.payment) && (
          <div className="mt-4 border border-forest-200 rounded-2xl bg-white p-5 text-sm">
            <p className="text-xs uppercase tracking-wide text-forest-500 mb-2">Payment</p>
            {Number(payment.total) === 0 ? (
              <Row k="Amount" v="No payment required" />
            ) : (
              <Row
                k="Deposit"
                v={
                  Number(payment.depositPaid) > 0 || payment.fullyPaid
                    ? `£${Number(payment.depositPaid || payment.depositDue).toFixed(2)} received`
                    : payment.declared
                      ? `£${Number(payment.depositDue).toFixed(2)} — awaiting confirmation`
                      : `£${Number(payment.depositDue).toFixed(2)} due`
                }
              />
            )}
          </div>
        )}

        {current === 'done' && (
          <div className="mt-6 border border-forest-200 bg-forest-50 rounded-2xl p-5">
            <p className="font-medium text-forest-950">You’re all set.</p>
            <p className="text-sm text-forest-700 mt-1">Everything is confirmed. {project.vendor.businessName} will be in touch about the next steps.</p>
          </div>
        )}

        {/* Files — shared galleries and deliverables */}
        {Array.isArray(project.files) && project.files.some((f: any) => f.type === 'gallery') && (
          <div className="mt-4 border border-forest-200 rounded-2xl bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-forest-500 mb-3">Your gallery</p>
            <ul className="space-y-2">
              {project.files.filter((f: any) => f.type === 'gallery').map((f: any) => (
                <li key={f.id}>
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-sm text-forest-800 underline underline-offset-2 hover:text-forest-950">
                    {f.name}
                  </a>
                </li>
              ))}
            </ul>
            <DeliveryApproval
              approved={Array.isArray(project.approvals) && project.approvals.length > 0}
              busy={busy}
              setBusy={setBusy}
              onDone={refresh}
            />
          </div>
        )}

        {/* Messages */}
        <ClientMessages vendorName={project.vendor.businessName} />

        {/* Help */}
        <p className="mt-8 text-xs text-forest-500 flex items-center gap-1.5">
          <HelpCircle size={13} />
          Questions? Contact {project.vendor.businessName}{project.vendor.phone ? ` on ${project.vendor.phone}` : ''}.
        </p>
      </div>
    </div>
  )
}

// ---- steps (logic unchanged from Stage 3/4) -------------------------

function ProjectDetails({ project, existing, busy, setBusy, onDone }: any) {
  const essentials = BASE_DETAIL_FIELDS
  const typeFields = detailQuestionsFor(project?.type ?? 'OTHER')
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = { ...(existing || {}) }
    // Pre-fill the basics the vendor already knows so the client only confirms.
    if (!seed.date && project?.eventDate) seed.date = new Date(project.eventDate).toISOString().slice(0, 10)
    if (!seed.venue && project?.location) seed.venue = project.location
    return seed
  })

  function set(key: string, value: string) {
    setValues(v => ({ ...v, [key]: value }))
  }

  function renderField(f: DetailField) {
    return (
      <Field key={f.key} label={f.label}>
        {f.type === 'textarea' ? (
          <textarea value={values[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} className={inputCls} rows={3} placeholder={f.placeholder} />
        ) : f.type === 'select' ? (
          <select value={values[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'}
            inputMode={f.key === 'phone' ? 'tel' : f.type === 'number' ? 'numeric' : undefined}
            min={f.type === 'number' ? 0 : undefined}
            value={values[f.key] ?? ''}
            onChange={e => set(f.key, e.target.value)}
            className={inputCls}
            placeholder={f.placeholder}
          />
        )}
      </Field>
    )
  }

  async function submit() {
    setBusy(true)
    const res = await fetch('/api/client/questionnaire', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: values, complete: true }),
    })
    setBusy(false)
    if (res.ok) onDone()
  }

  return (
    <Panel>
      <p className="text-sm text-forest-600 mb-4">
        Just a quick confirmation so your vendor can prepare everything for the day.
      </p>
      <p className="text-xs font-semibold uppercase tracking-wide text-forest-400 mb-3">The essentials</p>
      {essentials.map(renderField)}
      {typeFields.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-400 mb-3 mt-5">{sectionLabelFor(project?.type ?? 'OTHER')}</p>
          {typeFields.map(renderField)}
        </>
      )}
      <Primary onClick={submit} busy={busy}>Confirm details</Primary>
    </Panel>
  )
}

function ProposalStep({ proposal, busy, setBusy, onDone }: any) {
  const [error, setError] = useState('')
  async function accept() {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const r = await fetch('/api/client/proposal', { method: 'POST' })
      if (r.ok) onDone()
      else setError('We could not accept that just now. Please try again.')
    } catch {
      setError('Connection issue — please check your network and try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel>
      {proposal.description && <p className="text-forest-700 text-sm mb-3">{proposal.description}</p>}
      <p className="text-2xl font-medium text-forest-950">£{Number(proposal.price).toFixed(2)}</p>
      {Array.isArray(proposal.items) && (
        <ul className="mt-3 mb-4 space-y-1.5">
          {proposal.items.map((it: any, i: number) => (
            <li key={i} className="flex gap-2 text-sm text-forest-700"><CheckCircle size={15} className="text-forest-600 mt-0.5 shrink-0" />{it.name}</li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      <Primary onClick={accept} busy={busy}>Accept proposal</Primary>
    </Panel>
  )
}

function ContractStep({ contract, busy, setBusy, onDone }: any) {
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  async function sign() {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const r = await fetch('/api/client/contract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedBy: name, consent }),
      })
      if (r.ok) onDone()
      else setError('We could not save your signature just now. Please try again.')
    } catch {
      setError('Connection issue — please check your network and try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel>
      <div className="max-h-56 overflow-y-auto border border-forest-100 rounded-xl p-3 text-sm text-forest-700 whitespace-pre-wrap mb-4">{contract.content}</div>
      <label className="flex items-start gap-2 text-sm text-forest-700 mb-3">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />
        <span>By typing my name and confirming, I agree to the terms of this agreement.</span>
      </label>
      <input value={name} onChange={e => setName(e.target.value)} className={inputCls + ' mb-4'} placeholder="Type your full name" />
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      <Primary onClick={sign} busy={busy} disabled={!consent || name.trim().length < 2}>Sign agreement</Primary>
    </Panel>
  )
}

function PaymentStep({ payment, busy, setBusy, onDone }: any) {
  const [error, setError] = useState('')
  const method: 'manual' | 'stripe' | 'free' = payment?.method ?? 'manual'
  const total = Number(payment?.total ?? 0)
  const deposit = Number(payment?.depositDue ?? 0)
  // Stripe is only ever offered when a real Stripe configuration exists.
  const canPayOnline = method === 'stripe' && payment?.stripeConfigured

  // Free collaboration — nothing owed.
  if (total === 0) {
    return (
      <Panel>
        <p className="text-lg font-medium text-forest-950">No payment required</p>
        <p className="text-sm text-forest-600 mt-1">This project is a free collaboration — there’s nothing to pay.</p>
      </Panel>
    )
  }

  // Client has already reported a manual payment — waiting on the vendor.
  if (payment?.declared) {
    return (
      <Panel>
        <p className="text-lg font-medium text-forest-950">Thanks — payment reported</p>
        <p className="text-sm text-forest-600 mt-1">
          We’ve let your vendor know. They’ll confirm once the £{deposit.toFixed(2)} deposit has cleared.
        </p>
      </Panel>
    )
  }

  async function payOnline() {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const r = await fetch('/api/client/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'DEPOSIT' }) })
      if (r.ok) { onDone() } else {
        const body = await r.json().catch(() => ({}))
        setError(body.error || 'We could not process that just now. Please try again.')
      }
    } catch {
      setError('Connection issue — please check your network and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function declareManual() {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const r = await fetch('/api/client/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'DEPOSIT', mode: 'manual' }) })
      if (r.ok) { onDone() } else {
        const body = await r.json().catch(() => ({}))
        setError(body.error || 'We could not record that just now. Please try again.')
      }
    } catch {
      setError('Connection issue — please check your network and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <p className="text-2xl font-medium text-forest-950">£{deposit.toFixed(2)}</p>
      <p className="text-xs text-forest-500 mt-1 mb-4">Your deposit secures the booking.</p>
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      {canPayOnline ? (
        <Primary onClick={payOnline} busy={busy}>Pay securely online</Primary>
      ) : (
        <>
          <p className="text-sm text-forest-600 mb-3">
            Your vendor will confirm your payment once it’s received. Pay by the method you’ve agreed with them, then let them know below.
          </p>
          <Primary onClick={declareManual} busy={busy}>I’ve made the payment</Primary>
        </>
      )}
    </Panel>
  )
}

function DeliveryApproval({ approved, busy, setBusy, onDone }: any) {
  const [error, setError] = useState('')
  if (approved) {
    return (
      <div className="mt-4 border-t border-forest-100 pt-4">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-800">
          <CheckCircle size={16} className="text-forest-600" /> You’ve approved the delivery. Thank you!
        </p>
      </div>
    )
  }
  async function approve() {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const r = await fetch('/api/client/complete', { method: 'POST' })
      if (r.ok) { onDone() } else {
        const b = await r.json().catch(() => ({}))
        setError(b.error || 'We could not record that just now. Please try again.')
      }
    } catch {
      setError('Connection issue — please check your network and try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-4 border-t border-forest-100 pt-4">
      <p className="text-sm text-forest-600 mb-3">Happy with everything? Let your vendor know your gallery is approved.</p>
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      <Primary onClick={approve} busy={busy}>Approve delivery</Primary>
    </div>
  )
}

function ClientMessages({ vendorName }: { vendorName: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function loadMessages() {
    const res = await fetch('/api/client/messages')
    const parsed = await parseJsonResponse<{ messages?: any[] }>(res)
    if (parsed.ok) setMessages((parsed.data as any).messages || [])
    setLoaded(true)
  }

  useEffect(() => { loadMessages() }, [])

  async function send() {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    setDraft('')
    const res = await fetch('/api/client/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    const parsed = await parseJsonResponse<{ error?: string }>(res)
    setSending(false)
    if (parsed.ok) loadMessages()
  }

  if (!loaded) return null

  return (
    <div className="mt-8 border border-forest-200 rounded-2xl bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-forest-500 mb-3">Messages with {vendorName}</p>
      <div className="space-y-2.5 max-h-64 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-forest-500">No messages yet. Send a note if you have any questions.</p>
        ) : messages.map(m => {
          const mine = m.type === 'client' || m.sender?.role === 'CLIENT'
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-forest-950 text-paper-50' : 'bg-forest-50 text-forest-900'}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`mt-1 text-[11px] ${mine ? 'text-forest-300' : 'text-forest-400'}`}>
                  {mine ? 'You' : (m.sender?.name || vendorName)} · {new Date(m.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
          placeholder="Write a message…"
          className={inputCls}
        />
        <button onClick={send} disabled={!draft.trim() || sending}
          className="shrink-0 bg-forest-900 text-paper-50 rounded-xl px-4 disabled:opacity-40 hover:bg-forest-800 transition">
          {sending ? <Loader2 size={15} className="animate-spin" /> : 'Send'}
        </button>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-forest-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-forest-300'
const Centre = ({ children }: any) => <div className="min-h-screen bg-paper flex items-center justify-center px-6">{children}</div>
const Panel = ({ children }: any) => <div className="border border-forest-200 rounded-xl bg-white p-4">{children}</div>
const Field = ({ label, children }: any) => <div className="mb-4"><label className="block text-sm text-forest-700 mb-1.5">{label}</label>{children}</div>
const Row = ({ k, v }: any) => <div className="flex justify-between py-1"><span className="text-forest-600">{k}</span><span className="text-forest-950">{v}</span></div>
function Primary({ onClick, busy, disabled, children }: any) {
  return (
    <button onClick={onClick} disabled={busy || disabled}
      className="w-full bg-forest-900 text-paper-50 text-sm font-medium rounded-full py-3 disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-forest-800 transition">
      {busy && <Loader2 size={15} className="animate-spin" />}{children}
    </button>
  )
}
