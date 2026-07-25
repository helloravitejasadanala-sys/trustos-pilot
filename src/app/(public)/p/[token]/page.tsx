'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, HelpCircle } from 'lucide-react'
import { parseJsonResponse } from '@/lib/safe-json'
import { BASE_DETAIL_FIELDS, detailQuestionsFor, projectTypeLabel, sectionLabelFor, type DetailField } from '@/lib/project-types'
import { ClientPortalLayout } from '@/components/layout'

/**
 * Client portal — secure link journey.
 * Presentation follows Phase 1 (light & warm, forest CTA).
 * Data flow unchanged: every fetch derives the project from the secure session.
 */

type Data = { project: any; questionnaire: any; proposal: any; contract: any; payment: any }

const STEPS = [
  { key: 'questionnaire', label: 'Confirm your event details', time: '3 minutes', who: 'You', why: 'A few practical things about the day. About 3 minutes — no account needed.' },
  { key: 'proposal', label: 'Review and accept your proposal', time: '3 minutes', who: 'You', why: 'Check what’s included, then accept so your studio can prepare the agreement.' },
  { key: 'contract', label: 'Review and sign your agreement', time: '5 minutes', who: 'You', why: 'Read the terms, then type your name to confirm — takes about five minutes.' },
  { key: 'payment', label: 'Pay your deposit', time: '2 minutes', who: 'You', why: 'Your deposit secures the booking. Confirm once you’ve paid by the method agreed.' },
] as const

const DETAIL_CHIPS = [
  { key: 'time', label: 'Timings', icon: '🕑' },
  { key: 'venue', label: 'Venue', icon: '📍' },
  { key: 'phone', label: 'Contact', icon: '📞' },
  { key: 'notes', label: 'Notes', icon: '✎' },
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

  if (state === 'loading') {
    return (
      <ClientPortalLayout centered>
        <div className="w-full max-w-xl space-y-3" aria-busy="true" aria-label="Loading your project">
          <div className="h-8 w-1/2 animate-pulse rounded" style={{ background: 'var(--line)' }} />
          <div className="h-4 w-3/4 animate-pulse rounded" style={{ background: 'var(--line)' }} />
          <div className="mt-6 h-40 w-full animate-pulse rounded-[var(--r-lg)]" style={{ background: 'var(--line)' }} />
          <div className="h-24 w-full animate-pulse rounded-[var(--r-lg)]" style={{ background: 'var(--line)' }} />
        </div>
      </ClientPortalLayout>
    )
  }

  if (state === 'invalid' || !d) {
    return (
      <ClientPortalLayout centered>
        <div className="max-w-md text-center">
          <div className="banner banner-error mb-4" style={{ justifyContent: 'center' }}>
            This link isn&apos;t valid
          </div>
          <h1 className="serif" style={{ fontSize: 28, margin: '0 0 10px', color: 'var(--ink)' }}>
            We couldn&apos;t open this page
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
            It may have expired or been replaced. Ask your vendor for a new link.
          </p>
        </div>
      </ClientPortalLayout>
    )
  }

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

  const currentStep = STEPS.find(s => s.key === current)
  const stepIndex = current === 'done'
    ? STEPS.length
    : Math.max(1, STEPS.findIndex(s => s.key === current) + 1)
  const progressPct = current === 'done'
    ? 100
    : ((stepIndex - 1) / STEPS.length) * 100

  const clientFirst = project.client?.name?.split(' ')[0]
  const projectTitle = project.title.replace(/\s*\(demo\)/i, '')
  const vendorName = project.vendor.businessName as string
  const vendorInitial = (vendorName || 'S').charAt(0).toUpperCase()
  const typeLabel = projectTypeLabel(project.type || 'OTHER')
  const eventDate = project.eventDate
    ? new Date(project.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  const answers = questionnaire?.answers || {}
  const hasGallery = Array.isArray(project.files) && project.files.some((f: any) => f.type === 'gallery')
  const deliveryApproved = Array.isArray(project.approvals) && project.approvals.length > 0

  const quoteChip = !proposal
    ? { cls: 'chip chip-muted', label: 'Soon' }
    : done.proposal
      ? { cls: 'chip chip-success', label: 'Accepted' }
      : { cls: 'chip chip-amber', label: 'To review' }

  const paymentChip = (() => {
    if (!payment) return { cls: 'chip chip-muted', label: 'Soon' }
    if (Number(payment.total) === 0) return { cls: 'chip chip-success', label: 'None due' }
    if (done.payment) return { cls: 'chip chip-success', label: 'Received' }
    if (payment.declared) return { cls: 'chip chip-amber', label: 'Awaiting' }
    return { cls: 'chip chip-amber', label: 'Due' }
  })()

  const deliveryChip = deliveryApproved
    ? { cls: 'chip chip-success', label: 'Approved' }
    : hasGallery
      ? { cls: 'chip chip-amber', label: 'Ready' }
      : { cls: 'chip chip-muted', label: 'Soon' }

  return (
    <ClientPortalLayout
      brandName={vendorName}
      brandLetter={vendorInitial}
      forLine={clientFirst ? `For ${project.client?.name}` : undefined}
      title={projectTitle}
      stepLabel={`Step ${stepIndex} of ${STEPS.length}`}
      progressPct={progressPct}
    >
      <div className="portal-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* One current action — forest CTA, never lime */}
          {current !== 'done' && currentStep ? (
            <div>
              <div className="kicker" style={{ color: 'var(--coral-deep)', marginBottom: 9 }}>
                What we need from you
              </div>
              <div className="action-outline" style={{ padding: '22px 20px' }}>
                <div className="serif" style={{ fontSize: 'clamp(22px, 3vw, 25px)', lineHeight: 1.1, marginBottom: 6 }}>
                  {currentStep.label}
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 18px' }}>
                  {currentStep.why}
                </p>

                {current === 'questionnaire' && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 9,
                      marginBottom: 18,
                    }}
                  >
                    {DETAIL_CHIPS.map(chip => {
                      const filled = !!(answers[chip.key] || (chip.key === 'venue' && project.location) || (chip.key === 'time' && answers.time))
                      return (
                        <span
                          key={chip.key}
                          className="chip"
                          style={{
                            padding: 12,
                            justifyContent: 'flex-start',
                            background: filled ? 'var(--success-soft)' : 'var(--canvas-2)',
                            color: filled ? 'var(--success)' : 'var(--ink)',
                            border: filled ? '1px solid #bfe0cd' : '1px solid var(--line)',
                          }}
                        >
                          {chip.icon} {chip.label}{filled ? ' ✓' : ''}
                        </span>
                      )
                    })}
                  </div>
                )}

                {current === 'questionnaire' && (
                  <ProjectDetails project={project} existing={questionnaire?.answers} busy={busy} setBusy={setBusy} onDone={refresh} />
                )}
                {current === 'proposal' && (
                  <ProposalStep proposal={proposal} busy={busy} setBusy={setBusy} onDone={refresh} />
                )}
                {current === 'contract' && (
                  <ContractStep contract={contract} busy={busy} setBusy={setBusy} onDone={refresh} />
                )}
                {current === 'payment' && (
                  <PaymentStep payment={payment} busy={busy} setBusy={setBusy} onDone={refresh} />
                )}
              </div>
            </div>
          ) : (
            <div className="action-outline" style={{ padding: 24 }}>
              <div className="serif" style={{ fontSize: 25, lineHeight: 1.15, marginBottom: 8 }}>
                You&apos;re all set
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0, maxWidth: '48ch' }}>
                Nothing needed right now — {vendorName} is preparing your project and will be in touch about the next steps.
              </p>
            </div>
          )}

          <div className="portal-quote">
            <span
              className="marker"
              style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--forest)', color: '#fff' }}
            >
              {vendorInitial}
            </span>
            <div>
              <div className="serif" style={{ fontStyle: 'italic', fontSize: 19, lineHeight: 1.3 }}>
                &ldquo;Anything you need, just message us right here.&rdquo;
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                {vendorName}
              </div>
            </div>
          </div>
        </div>

        {/* Status rail */}
        <div className="portal-status">
          <div style={{ font: 'var(--t-xs)', fontWeight: 700 }}>Where things stand</div>

          <div className="panel portal-status-row">
            <span className="marker marker-photo" style={{ width: 36, height: 36, borderRadius: 9 }}>
              {typeLabel.charAt(0)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Your project</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {[typeLabel, eventDate].filter(Boolean).join(' · ') || 'Details coming'}
              </div>
            </div>
            <span className={current === 'done' ? 'chip chip-success' : 'chip chip-lav'}>
              {current === 'done' ? 'On track' : 'In prep'}
            </span>
          </div>

          <div className="panel portal-status-row">
            <span className="marker" style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--success-soft)', color: 'var(--success)' }}>£</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Your quote</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {proposal
                  ? `£${Number(proposal.price).toFixed(0)}${proposal.title ? ` · ${proposal.title}` : ''}`
                  : 'Waiting for your studio'}
              </div>
            </div>
            <span className={quoteChip.cls}>{quoteChip.label}</span>
          </div>

          <div className="panel portal-status-row">
            <span className="marker" style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--amber-soft)', color: 'var(--amber)' }}>⇄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Payment</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {!payment
                  ? 'Opens after the agreement'
                  : Number(payment.total) === 0
                    ? 'No payment required'
                    : payment.declared && !done.payment
                      ? 'Bank transfer · awaiting confirmation'
                      : done.payment
                        ? 'Deposit confirmed'
                        : `£${Number(payment.depositDue).toFixed(0)} deposit`}
              </div>
            </div>
            <span className={paymentChip.cls}>{paymentChip.label}</span>
          </div>

          <div className="panel portal-status-row">
            <span className="marker" style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--recessed)', color: 'var(--faint)' }}>⬇</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Your delivery</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {hasGallery ? 'Files are ready below' : 'Ready a few days after'}
              </div>
            </div>
            <span className={deliveryChip.cls}>{deliveryChip.label}</span>
          </div>
        </div>
      </div>

      {/* Payment status summary */}
      {payment && (done.contract || done.payment) && (
        <div className="panel" style={{ padding: 18 }}>
          <div className="kicker" style={{ color: 'var(--faint)', marginBottom: 10 }}>Payment</div>
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

      {/* Files — shared galleries and deliverables */}
      {hasGallery && (
        <div className="panel" style={{ padding: 18 }}>
          <div className="kicker" style={{ color: 'var(--faint)', marginBottom: 12 }}>Your files</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }} className="space-y-2">
            {project.files.filter((f: any) => f.type === 'gallery').map((f: any) => (
              <li key={f.id}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 14, color: 'var(--forest)', textDecoration: 'underline', textUnderlineOffset: 2 }}
                >
                  {f.name}
                </a>
              </li>
            ))}
          </ul>
          <DeliveryApproval
            approved={deliveryApproved}
            busy={busy}
            setBusy={setBusy}
            onDone={refresh}
          />
        </div>
      )}

      <ClientMessages vendorName={vendorName} />

      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
        <HelpCircle size={13} />
        Questions? Contact {vendorName}{project.vendor.phone ? ` on ${project.vendor.phone}` : ''}.
      </p>
    </ClientPortalLayout>
  )
}

// ---- steps (logic unchanged) ----------------------------------------

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
    <div>
      <p className="kicker" style={{ color: 'var(--faint)', marginBottom: 10 }}>The essentials</p>
      {essentials.map(renderField)}
      {typeFields.length > 0 && (
        <>
          <p className="kicker" style={{ color: 'var(--faint)', margin: '18px 0 10px' }}>{sectionLabelFor(project?.type ?? 'OTHER')}</p>
          {typeFields.map(renderField)}
        </>
      )}
      <Primary onClick={submit} busy={busy}>Confirm event details</Primary>
    </div>
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
    <div>
      {proposal.description && (
        <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '0 0 12px' }}>{proposal.description}</p>
      )}
      <p className="num" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 12px', color: 'var(--ink)' }}>
        £{Number(proposal.price).toFixed(2)}
      </p>
      {Array.isArray(proposal.items) && (
        <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none' }} className="space-y-1.5">
          {proposal.items.map((it: any, i: number) => (
            <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: 'var(--ink)' }}>
              <CheckCircle size={15} style={{ color: 'var(--success)', marginTop: 2, flexShrink: 0 }} />
              {it.name}
            </li>
          ))}
        </ul>
      )}
      {error && <div className="banner banner-error mb-3">{error}</div>}
      <Primary onClick={accept} busy={busy}>Accept proposal</Primary>
    </div>
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
    <div>
      <div
        className="context"
        style={{
          maxHeight: 220,
          overflowY: 'auto',
          fontSize: 13.5,
          color: 'var(--ink)',
          whiteSpace: 'pre-wrap',
          marginBottom: 14,
          padding: 14,
        }}
      >
        {contract.content}
      </div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13.5, color: 'var(--ink)', marginBottom: 12 }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
        <span>By typing my name and confirming, I agree to the terms of this agreement.</span>
      </label>
      <input value={name} onChange={e => setName(e.target.value)} className={inputCls} style={{ marginBottom: 14 }} placeholder="Type your full name" />
      {error && <div className="banner banner-error mb-3">{error}</div>}
      <Primary onClick={sign} busy={busy} disabled={!consent || name.trim().length < 2}>Sign agreement</Primary>
    </div>
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
      <div>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>No payment required</p>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
          This project is a free collaboration — there&apos;s nothing to pay.
        </p>
      </div>
    )
  }

  // Client has already reported a manual payment — waiting on the vendor.
  if (payment?.declared) {
    return (
      <div>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>Thanks — payment reported</p>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
          We&apos;ve let your vendor know. They&apos;ll confirm once the £{deposit.toFixed(2)} deposit has cleared.
        </p>
      </div>
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
    <div>
      <p className="num" style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>£{deposit.toFixed(2)}</p>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '4px 0 14px' }}>Your deposit secures the booking.</p>
      {error && <div className="banner banner-error mb-3">{error}</div>}
      {canPayOnline ? (
        <Primary onClick={payOnline} busy={busy}>Pay securely online</Primary>
      ) : (
        <>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 14px' }}>
            Your vendor will confirm your payment once it&apos;s received. Pay by the method you&apos;ve agreed with them, then let them know below.
          </p>
          <Primary onClick={declareManual} busy={busy}>I&apos;ve made the payment</Primary>
        </>
      )}
    </div>
  )
}

function DeliveryApproval({ approved, busy, setBusy, onDone }: any) {
  const [error, setError] = useState('')
  if (approved) {
    return (
      <div className="banner banner-success" style={{ marginTop: 14 }}>
        You&apos;ve approved the delivery. Thank you!
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
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 12px' }}>
        Happy with everything? Let your vendor know the deliverables are approved.
      </p>
      {error && <div className="banner banner-error mb-3">{error}</div>}
      <Primary onClick={approve} busy={busy}>Approve delivery</Primary>
    </div>
  )
}

function ClientMessages({ vendorName }: { vendorName: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [sendError, setSendError] = useState('')

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
    setSendError('')
    setDraft('')
    const res = await fetch('/api/client/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    const parsed = await parseJsonResponse<{ error?: string }>(res)
    setSending(false)
    if (parsed.ok) loadMessages()
    else {
      setDraft(content)
      setSendError("Message didn't send — tap to retry.")
    }
  }

  if (!loaded) {
    return (
      <div className="panel" style={{ padding: 18 }} aria-busy="true">
        <div className="h-4 w-40 animate-pulse rounded mb-3" style={{ background: 'var(--line)' }} />
        <div className="h-16 w-3/4 animate-pulse rounded-xl mb-2" style={{ background: 'var(--line)' }} />
        <div className="h-16 w-1/2 animate-pulse rounded-xl ml-auto" style={{ background: 'var(--line)' }} />
      </div>
    )
  }

  return (
    <div>
      <div style={{ font: 'var(--t-h2)', marginBottom: 12 }}>Messages · {vendorName}</div>
      <div className="panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="space-y-3.5 max-h-64 overflow-y-auto" aria-live="polite" role="log">
          {messages.length === 0 ? (
            <div className="empty" style={{ padding: '24px 8px' }}>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>
                No messages yet — say hello.
              </p>
            </div>
          ) : messages.map(m => {
            const mine = m.type === 'client' || m.sender?.role === 'CLIENT'
            return (
              <div key={m.id} style={{ display: 'flex', gap: 10, flexDirection: mine ? 'row-reverse' : 'row' }}>
                <span
                  className="marker"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    fontSize: 11,
                    background: mine ? 'var(--forest)' : 'var(--recessed)',
                    color: mine ? '#fff' : 'var(--muted)',
                  }}
                >
                  {mine ? 'Y' : vendorName.charAt(0).toUpperCase()}
                </span>
                <div style={{ maxWidth: '74%' }}>
                  <div className={mine ? 'ws-msg-mine' : 'ws-msg-theirs'}>
                    <p className="whitespace-pre-wrap" style={{ margin: 0 }}>{m.content}</p>
                  </div>
                  <div
                    className="num"
                    style={{
                      fontSize: 10.5,
                      color: 'var(--faint)',
                      marginTop: 4,
                      textAlign: mine ? 'right' : 'left',
                    }}
                  >
                    {new Date(m.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {sendError && (
          <button type="button" className="banner banner-error" style={{ border: '1px solid #e0b8a8', cursor: 'pointer', width: '100%' }} onClick={send}>
            {sendError}
          </button>
        )}
        <div style={{ display: 'flex', gap: 10, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
            placeholder="Write a reply…"
            className="flex-1"
            style={{
              padding: '11px 14px',
              background: 'var(--canvas-2)',
              border: '1px solid var(--line)',
              borderRadius: 9,
            }}
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || sending}
            className="btn btn-forest"
            style={{ minHeight: 44 }}
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full'
const Field = ({ label, children }: any) => (
  <div style={{ marginBottom: 14 }}>
    <label className="label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
    {children}
  </div>
)
const Row = ({ k, v }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', fontSize: 13.5 }}>
    <span style={{ color: 'var(--muted)' }}>{k}</span>
    <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{v}</span>
  </div>
)
function Primary({ onClick, busy, disabled, children }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="btn btn-forest btn-block"
      style={{ minHeight: 44 }}
    >
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  )
}
