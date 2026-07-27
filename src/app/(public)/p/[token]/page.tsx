'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, HelpCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { parseJsonResponse } from '@/lib/safe-json'
import { BASE_DETAIL_FIELDS, projectTypeLabel, type DetailField } from '@/lib/project-types'
import {
  detailQuestionsForService,
  getServiceProfile,
  sectionLabelForService,
} from '@/lib/service-profiles'
import { ClientPortalLayout } from '@/components/layout'
import TypingPreview from '@/components/ui/TypingPreview'
import { useMessagePoll } from '@/hooks/useMessagePoll'
import { useVisiblePoll } from '@/hooks/useVisiblePoll'
import {
  DECLARED_PAYMENT_OPTIONS,
  declaredPaymentMethodLabel,
  type DeclaredPaymentMethod,
} from '@/lib/payment-declare'

/**
 * Client portal — secure link journey.
 * Presentation follows Phase 1 (light & warm, forest CTA).
 * Data flow unchanged: every fetch derives the project from the secure session.
 */

type Data = { project: any; questionnaire: any; proposal: any; contract: any; payment: any }

function clientSteps(service?: string | null) {
  const profile = getServiceProfile(service)
  const deposit = profile.depositLabel.toLowerCase()
  return [
    {
      key: 'questionnaire' as const,
      label: `Confirm your ${profile.questionnaireLabel.toLowerCase()}`,
      time: '3 minutes',
      who: 'You',
      why: 'Short confirmations so your vendor can prepare the right quote — about 2 minutes.',
    },
    {
      key: 'proposal' as const,
      label: 'Review your quote',
      time: '3 minutes',
      who: 'You',
      why: 'Check what’s included, then accept so the agreement can be prepared.',
    },
    {
      key: 'contract' as const,
      label: 'Sign your agreement',
      time: '5 minutes',
      who: 'You',
      why: 'Read the terms, then type your name to confirm.',
    },
    {
      key: 'payment' as const,
      label: `Pay your ${deposit}`,
      time: '2 minutes',
      who: 'You',
      why: `Your ${deposit} secures the booking. Confirm once you’ve paid.`,
    },
  ]
}

export default function ClientJourney({ params }: { params: { token: string } }) {
  const [state, setState] = useState<'loading' | 'invalid' | 'session' | 'transient' | 'ready'>('loading')
  const [d, setD] = useState<Data | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh(): Promise<'ok' | 'session' | 'transient' | 'error'> {
    const [project, questionnaire, proposal, contract, payment] = await Promise.all([
      fetch('/api/client/project', { credentials: 'same-origin' }).then(r => parseJsonResponse(r)),
      fetch('/api/client/questionnaire', { credentials: 'same-origin' }).then(r => parseJsonResponse(r)),
      fetch('/api/client/proposal', { credentials: 'same-origin' }).then(r => parseJsonResponse(r)),
      fetch('/api/client/contract', { credentials: 'same-origin' }).then(r => parseJsonResponse(r)),
      fetch('/api/client/payment', { credentials: 'same-origin' }).then(r => parseJsonResponse(r)),
    ])
    if (!project.ok) {
      if (project.status === 401) return 'session'
      if (
        project.status >= 500 ||
        (project.data as any)?.code === 'DB_UNAVAILABLE'
      ) {
        return 'transient'
      }
      return 'error'
    }
    if (!(project.data as any).project) return 'error'
    setD({
      project: (project.data as any).project,
      questionnaire: questionnaire.ok ? (questionnaire.data as any).questionnaire ?? null : null,
      proposal: proposal.ok ? (proposal.data as any).proposal ?? null : null,
      contract: contract.ok ? (contract.data as any).contract ?? null : null,
      payment: payment.ok ? (payment.data as any).payment ?? null : null,
    })
    return 'ok'
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = params.token
      if (!token || token.length < 20) {
        setState('invalid')
        return
      }

      async function exchange(): Promise<'ok' | 'invalid' | 'transient'> {
        const res = await fetch(`/api/client/invite/${encodeURIComponent(token)}`, {
          method: 'POST',
          credentials: 'same-origin',
        })
        const parsed = await parseJsonResponse(res)
        if (parsed.ok) return 'ok'
        if (
          res.status >= 500 ||
          (parsed.data as any)?.code === 'DB_UNAVAILABLE'
        ) {
          return 'transient'
        }
        return 'invalid'
      }

      try {
        // One retry covers Neon/Vercel cold-start blips that otherwise surface as "invalid".
        let invited = await exchange()
        if (invited !== 'ok') {
          await new Promise(r => setTimeout(r, 600))
          invited = await exchange()
        }
        if (cancelled) return
        if (invited === 'transient') {
          setState('transient')
          return
        }
        if (invited === 'invalid') {
          setState('invalid')
          return
        }

        let result = await refresh()
        if (result === 'session') {
          // Cookie may not have landed — re-exchange once, then reload project.
          await exchange()
          if (cancelled) return
          result = await refresh()
        }
        if (cancelled) return
        if (result === 'ok') setState('ready')
        else if (result === 'session') setState('session')
        else if (result === 'transient') setState('transient')
        else setState('invalid')
      } catch {
        if (!cancelled) setState('transient')
      }
    })()
    return () => { cancelled = true }
  }, [params.token])

  // Soft state poll: project + payment. Questionnaire/proposal/contract
  // completion flags come from the project embed so next steps don't stick.
  useVisiblePoll({
    enabled: state === 'ready',
    intervalMs: 8000,
    tick: async () => {
      const [project, payment] = await Promise.all([
        fetch('/api/client/project', { credentials: 'same-origin' }).then(r => parseJsonResponse(r)),
        fetch('/api/client/payment', { credentials: 'same-origin' }).then(r => parseJsonResponse(r)),
      ])
      if (!project.ok || !(project.data as any).project) return
      const p = (project.data as any).project
      setD(prev => {
        if (!prev) return prev
        const nextPayment = payment.ok
          ? (payment.data as any).payment ?? null
          : prev.payment
        // Project embeds proposal — promote so a new quote appears without a third GET.
        // Keep paymentSchedule from the proposal GET (project payload does not include it).
        const nextProposal = p.proposal
          ? {
              ...(prev.proposal || {}),
              ...p.proposal,
              paymentSchedule: (prev.proposal as any)?.paymentSchedule,
            }
          : prev.proposal
        let nextContract = prev.contract
        if (p.contract?.signedAt && prev.contract) {
          nextContract = { ...prev.contract, signedAt: p.contract.signedAt }
        } else if (p.contract?.signedAt && !prev.contract) {
          nextContract = { signedAt: p.contract.signedAt }
        }
        const nextQuestionnaire =
          p.questionnaire?.completedAt && !prev.questionnaire?.completedAt
            ? { ...(prev.questionnaire || {}), completedAt: p.questionnaire.completedAt, answers: prev.questionnaire?.answers }
            : prev.questionnaire
        return {
          ...prev,
          project: p,
          payment: nextPayment,
          proposal: nextProposal,
          contract: nextContract,
          questionnaire: nextQuestionnaire,
        }
      })
    },
  })

  if (state === 'loading') {
    return (
      <ClientPortalLayout centered>
        <div className="w-full max-w-xl space-y-3" aria-busy="true" aria-label="Loading your event">
          <div className="h-8 w-1/2 animate-pulse rounded" style={{ background: 'var(--line)' }} />
          <div className="h-4 w-3/4 animate-pulse rounded" style={{ background: 'var(--line)' }} />
          <div className="mt-6 h-40 w-full animate-pulse rounded-[var(--r-lg)]" style={{ background: 'var(--line)' }} />
          <div className="h-24 w-full animate-pulse rounded-[var(--r-lg)]" style={{ background: 'var(--line)' }} />
        </div>
      </ClientPortalLayout>
    )
  }

  if (state === 'transient') {
    return (
      <ClientPortalLayout centered>
        <div className="max-w-md text-center">
          <div className="banner banner-error mb-4" style={{ justifyContent: 'center' }}>
            Temporary problem
          </div>
          <h1 className="serif" style={{ fontSize: 28, margin: '0 0 10px', color: 'var(--ink)' }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
            Please try again in a moment. Your booking is safe — this is a temporary connection issue, not a problem with your link.
          </p>
          <button
            type="button"
            className="btn btn-forest"
            style={{ marginTop: 18, minHeight: 44 }}
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </ClientPortalLayout>
    )
  }

  if (state === 'invalid' || state === 'session' || !d) {
    const isSession = state === 'session'
    return (
      <ClientPortalLayout centered>
        <div className="max-w-md text-center">
          <div className="banner banner-error mb-4" style={{ justifyContent: 'center' }}>
            {isSession ? "Couldn't start your session" : "This link isn't valid"}
          </div>
          <h1 className="serif" style={{ fontSize: 28, margin: '0 0 10px', color: 'var(--ink)' }}>
            We couldn&apos;t open this page
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
            {isSession
              ? 'Refresh this page. If it still fails, ask your vendor for a fresh booking link — nothing is lost on their side.'
              : 'This private link may have expired or been replaced. Ask your vendor for a new one — your booking is still with them.'}
          </p>
          {isSession && (
            <button
              type="button"
              className="btn btn-forest"
              style={{ marginTop: 18, minHeight: 44 }}
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          )}
        </div>
      </ClientPortalLayout>
    )
  }

  const { project, questionnaire, proposal, contract, payment } = d
  const serviceKey = (project.service || project.vendor?.primaryService) as string | undefined
  const serviceProfile = getServiceProfile(serviceKey)
  const STEPS = clientSteps(serviceKey)
  const depositSettled =
    !!payment &&
    (Number(payment.depositPaid) > 0 || payment.fullyPaid || Number(payment.total) === 0)
  const balanceCollectOpen =
    !!payment &&
    !!payment.balanceRequested &&
    Number(payment.balanceDue) > 0 &&
    !payment.fullyPaid
  const done = {
    questionnaire: !!questionnaire?.completedAt,
    proposal: !!proposal?.acceptedAt,
    contract: !!contract?.signedAt,
    // Schedule path: keep the Pay step mounted until fully paid so the client
    // always sees the full plan (confirmed / due / upcoming) — not only when a
    // stage is open. Legacy path still closes after deposit until balance opens.
    payment:
      !!payment &&
      (payment.fullyPaid ||
        Number(payment.total) === 0 ||
        (payment.hasSchedule
          ? false
          : depositSettled && !balanceCollectOpen && !payment.pendingDeposit)),
  }
  // Never show Pay before an agreement exists and is signed.
  const waitingForAgreement = !!done.proposal && !contract
  const waitingForQuote = done.questionnaire && !proposal
  let current: (typeof STEPS)[number]['key'] | 'done' = 'done'
  if (!done.questionnaire) current = 'questionnaire'
  else if (proposal && !done.proposal) current = 'proposal'
  else if (contract && !done.contract) current = 'contract'
  else if (waitingForAgreement || waitingForQuote) current = 'done'
  else if (payment && !done.payment) current = 'payment'

  const currentStep = STEPS.find(s => s.key === current)
  // Waiting on vendor must not look “finished” (100%) — that misled clients.
  const progressPct = (() => {
    if (current === 'questionnaire') return 5
    if (waitingForQuote) return Math.round((1 / STEPS.length) * 100)
    if (current === 'proposal') return Math.round((1 / STEPS.length) * 100)
    if (waitingForAgreement) return Math.round((2 / STEPS.length) * 100)
    if (current === 'contract') return Math.round((2 / STEPS.length) * 100)
    if (current === 'payment') return Math.round((3 / STEPS.length) * 100)
    if (current === 'done') return 100
    return Math.round((Math.max(0, STEPS.findIndex(s => s.key === current)) / STEPS.length) * 100)
  })()

  const clientFirst = project.client?.name?.split(' ')[0]
  const projectTitle = project.title.replace(/\s*\(demo\)/i, '')
  const vendorName = project.vendor.businessName as string
  const vendorInitial = (vendorName || 'S').charAt(0).toUpperCase()
  const typeLabel = projectTypeLabel(project.type || 'OTHER')
  const eventDate = project.eventDate
    ? new Date(project.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  const hasGallery = Array.isArray(project.files) && project.files.some(
    (f: any) => f.type === 'gallery' || f.type === 'recording',
  )
  const deliveryApproved = Array.isArray(project.approvals) && project.approvals.length > 0
  const showDelivery = serviceProfile.features.showDelivery
  const canLeaveReview =
    !project.review && (deliveryApproved || project.status === 'COMPLETED')
  const clientClosed = !!project.review && (deliveryApproved || project.status === 'COMPLETED')

  const nextLabel = clientClosed
    ? 'Complete'
    : canLeaveReview
      ? 'Last step — quick review'
      : current === 'done'
        ? waitingForQuote
          ? `Waiting for ${vendorName}`
          : waitingForAgreement
            ? `Waiting for ${vendorName}`
            : (showDelivery && hasGallery && !deliveryApproved ? 'Review your files' : 'You’re booked')
        : currentStep
          ? `Next: ${currentStep.label}`
          : 'Your event'

  const bookingLine = [typeLabel, eventDate].filter(Boolean).join(' · ')
  const filesLabel =
    serviceProfile.features.deliverableKind === 'recording' ? 'Your recording' : 'Your gallery'
  const fileLinks = hasGallery
    ? (project.files as any[]).filter((f: any) => f.type === 'gallery' || f.type === 'recording')
    : []

  return (
    <ClientPortalLayout
      brandName={vendorName}
      brandLetter={vendorInitial}
      forLine={`Your event with ${vendorName}`}
      title={projectTitle}
      stepLabel={clientClosed ? 'Complete' : nextLabel}
      progressPct={clientClosed ? 100 : progressPct}
      showProgress={!clientClosed}
    >
      <div className="flex min-w-0 flex-col gap-4" style={{ maxWidth: 640, margin: '0 auto' }}>
        {bookingLine ? (
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>
            {clientFirst ? `${clientFirst} · ` : ''}{bookingLine}
          </p>
        ) : null}

        {/* Closed booking: special end state — outputs only, no chat. */}
        {clientClosed ? (
          <>
            <div
              className="panel"
              style={{
                padding: '22px 20px',
                background:
                  'linear-gradient(165deg, color-mix(in srgb, var(--forest) 8%, var(--paper)) 0%, var(--paper) 55%)',
                border: '1px solid color-mix(in srgb, var(--forest) 18%, var(--line))',
              }}
            >
              <div className="kicker" style={{ color: 'var(--forest)', marginBottom: 10 }}>
                Booking complete
              </div>
              <p className="serif" style={{ fontSize: 'clamp(26px, 6vw, 32px)', margin: '0 0 10px', color: 'var(--ink)', lineHeight: 1.12 }}>
                {clientFirst ? `Thank you, ${clientFirst}` : 'Thank you'}
              </p>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--ink)', lineHeight: 1.5, maxWidth: '42ch' }}>
                {fileLinks.length > 0
                  ? `${vendorName} finished this booking. Your files stay on this private link whenever you need them.`
                  : `${vendorName} finished this booking with you. You’re all set — nothing else is needed here.`}
              </p>
              {project.review?.overall ? (
                <p style={{ margin: '14px 0 0', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                  Thanks for your {project.review.overall}/5 review.
                </p>
              ) : (
                <p style={{ margin: '14px 0 0', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                  Thanks for your feedback.
                </p>
              )}
            </div>

            {fileLinks.length > 0 ? (
              <div className="panel" style={{ padding: 20 }}>
                <div className="kicker" style={{ color: 'var(--forest)', marginBottom: 8 }}>
                  {filesLabel}
                </div>
                <p className="serif" style={{ fontSize: 22, margin: '0 0 6px', color: 'var(--ink)', lineHeight: 1.15 }}>
                  Your outputs
                </p>
                <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                  Open or download anytime — keep a copy somewhere safe.
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {fileLinks.map((f: any, i: number) => (
                    <li
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                        padding: '12px 0',
                        borderTop: i === 0 ? undefined : '1px solid var(--line-soft)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: 'var(--ink)',
                          overflowWrap: 'anywhere',
                          minWidth: 0,
                          flex: '1 1 140px',
                        }}
                      >
                        {f.name || 'File'}
                      </span>
                      <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-forest"
                          style={{ minHeight: 40, padding: '0 14px', fontSize: 13, textDecoration: 'none' }}
                        >
                          Open
                        </a>
                        <a
                          href={f.url}
                          download={f.name || true}
                          target="_blank"
                          rel="noreferrer"
                          className="btn"
                          style={{
                            minHeight: 40,
                            padding: '0 14px',
                            fontSize: 13,
                            textDecoration: 'none',
                            background: 'var(--canvas-2)',
                            border: '1px solid var(--line)',
                            color: 'var(--ink)',
                          }}
                        >
                          Download
                        </a>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--faint)', lineHeight: 1.45 }}>
              Private link · only you and {vendorName}
              {project.vendor.phone ? ` · ${project.vendor.phone}` : ''}.
            </p>
          </>
        ) : (
          <>
            {current !== 'done' && currentStep ? (
              <div className="min-w-0">
                <div className="kicker" style={{ color: 'var(--coral-deep)', marginBottom: 9 }}>
                  What we need from you
                </div>
                <div className="action-outline" style={{ padding: '16px 14px' }}>
                  <div className="serif break-words" style={{ fontSize: 'clamp(20px, 5.5vw, 25px)', lineHeight: 1.1, marginBottom: 6 }}>
                    {currentStep.label}
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 14px' }}>
                    {currentStep.why}
                  </p>
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
                    <PaymentStep
                      payment={payment}
                      depositLabel={serviceProfile.depositLabel}
                      busy={busy}
                      setBusy={setBusy}
                      onDone={refresh}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="action-outline" style={{ padding: '16px 14px' }}>
                <div className="kicker" style={{ color: 'var(--coral-deep)', marginBottom: 9 }}>
                  With {vendorName}
                </div>
                <div className="serif break-words" style={{ fontSize: 'clamp(22px, 6vw, 25px)', lineHeight: 1.15, marginBottom: 8 }}>
                  {canLeaveReview
                    ? `Leave a quick review for ${vendorName}`
                    : waitingForQuote
                      ? `Wait for ${vendorName} to send your quote`
                      : waitingForAgreement
                        ? `Wait for ${vendorName} to send your agreement`
                        : showDelivery && hasGallery && !deliveryApproved
                          ? 'Your files are ready'
                          : depositSettled && !payment?.fullyPaid && !balanceCollectOpen
                            ? `${serviceProfile.depositLabel} confirmed`
                            : 'Nothing needed from you right now'}
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0, maxWidth: '48ch' }}>
                  {canLeaveReview
                    ? 'About 30 seconds — stars plus two short answers. Only they see this. Scroll down to finish.'
                    : waitingForQuote
                      ? `You’re not finished — ${vendorName} still needs to send a quote. You’ll see it on this page. Message them below if you have questions.`
                      : waitingForAgreement
                        ? `${vendorName} will send your agreement here next. You’ll sign it before any payment.`
                        : showDelivery && hasGallery && !deliveryApproved
                          ? 'Open the files below, then approve when you’re happy.'
                          : depositSettled && !payment?.fullyPaid && !balanceCollectOpen
                            ? `You’re set for now — next is your event. ${vendorName} will update this page if they need anything else (including the balance later).`
                            : `${vendorName} will update this page when they need you.`}
                </p>
              </div>
            )}

            {showDelivery && hasGallery && (
              <div className="panel" style={{ padding: 18 }}>
                <div className="kicker" style={{ color: 'var(--faint)', marginBottom: 12 }}>
                  {filesLabel}
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }} className="space-y-2">
                  {fileLinks.map((f: any) => (
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
                {serviceProfile.features.showApproval && !deliveryApproved && (
                  <DeliveryApproval
                    approved={false}
                    busy={busy}
                    setBusy={setBusy}
                    onDone={refresh}
                  />
                )}
                {serviceProfile.features.showApproval && deliveryApproved && (
                  <div className="banner banner-success" style={{ marginTop: 14 }}>
                    Delivery approved.
                  </div>
                )}
              </div>
            )}

            {canLeaveReview ? (
              <div className="panel" style={{ padding: 18 }}>
                <div className="kicker" style={{ color: 'var(--coral-deep)', marginBottom: 8 }}>Last step</div>
                <p className="serif" style={{ fontSize: 22, margin: '0 0 6px', color: 'var(--ink)', lineHeight: 1.15 }}>
                  Quick review for {vendorName}
                </p>
                <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--muted)' }}>
                  About 30 seconds — stars plus two short answers. Only {vendorName} sees this.
                </p>
                <ReviewStep busy={busy} setBusy={setBusy} onDone={refresh} />
              </div>
            ) : null}

            <ClientMessages vendorName={vendorName} />

            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
              <HelpCircle size={13} />
              Questions? Message {vendorName} above{project.vendor.phone ? `, or call ${project.vendor.phone}` : ''}.
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--faint)', lineHeight: 1.45 }}>
              Private booking link · only you and {vendorName} can see this. No account needed.
            </p>
          </>
        )}
      </div>
    </ClientPortalLayout>
  )
}

// ---- steps -----------------------------------------------------------

function ProjectDetails({ project, existing, busy, setBusy, onDone }: any) {
  const service = project?.service || project?.vendor?.primaryService
  const profile = getServiceProfile(service)
  const essentials = BASE_DETAIL_FIELDS
  const typeFields = detailQuestionsForService(project?.type ?? 'OTHER', service)
  const requiredKeys = new Set(['mainContact', 'phone', 'date', 'venue'])
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
    const required = requiredKeys.has(f.key)
    return (
      <Field key={f.key} label={`${f.label}${required ? ' *' : ''}`}>
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
            required={required}
          />
        )}
      </Field>
    )
  }

  async function submit() {
    const missing = ['mainContact', 'phone', 'date', 'venue'].filter(
      k => !String(values[k] ?? '').trim(),
    )
    if (missing.length) {
      toast.error('Fill contact name, phone, date, and venue before confirming.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/client/questionnaire', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: values, complete: true }),
      })
      if (res.ok) {
        toast.success(`Thanks — wait for ${project?.vendor?.businessName || 'your vendor'} to send your quote here.`)
        onDone()
      } else {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || 'Could not save. Check your connection and try again.')
      }
    } catch {
      toast.error('Could not save. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="kicker" style={{ color: 'var(--faint)', marginBottom: 6 }}>{profile.questionnaireLabel}</p>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--muted)' }}>
        We filled what your vendor already knows — confirm or edit anything.
      </p>
      {essentials.map(renderField)}
      {typeFields.length > 0 && (
        <>
          <p className="kicker" style={{ color: 'var(--faint)', margin: '18px 0 10px' }}>
            {sectionLabelForService(project?.type ?? 'OTHER', service)}
          </p>
          {typeFields.map(renderField)}
        </>
      )}
      <Primary onClick={submit} busy={busy}>Confirm event details</Primary>
      <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
        Next: your vendor prepares the quote. You’ll see it here.
      </p>
    </div>
  )
}

function QuotePaymentSchedule({
  schedule,
  legacyDeposit,
  total,
}: {
  schedule: Array<{
    id?: string
    name: string
    amount: number
    timingLabel: string
    sortOrder?: number
  }> | null | undefined
  legacyDeposit?: number | null
  total: number
}) {
  const rows =
    Array.isArray(schedule) && schedule.length > 0
      ? [...schedule].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      : null

  return (
    <div
      style={{
        margin: '0 0 16px',
        padding: 14,
        borderRadius: 12,
        border: '1px solid var(--line)',
        background: 'var(--canvas-2)',
      }}
    >
      <div className="kicker" style={{ color: 'var(--forest)', marginBottom: 8 }}>
        Payment schedule
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>
        Here is every payment for this booking — nothing else will be asked later without you seeing it first.
      </p>
      {rows ? (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {rows.map((s, i) => (
            <li
              key={s.id || `${s.name}-${i}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderTop: i === 0 ? undefined : '1px solid var(--line-soft)',
                fontSize: 14,
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)' }}>{s.name}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                  {s.timingLabel}
                </span>
              </span>
              <span className="num" style={{ fontWeight: 700, color: 'var(--ink)', flexShrink: 0 }}>
                £{Number(s.amount).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          <li
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 0',
              fontSize: 14,
            }}
          >
            <span>
              <span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)' }}>On booking</span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                Deposit
              </span>
            </span>
            <span className="num" style={{ fontWeight: 700 }}>
              £{Number(legacyDeposit ?? 0).toFixed(2)}
            </span>
          </li>
          {Number(total) - Number(legacyDeposit ?? 0) > 0.005 && (
            <li
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderTop: '1px solid var(--line-soft)',
                fontSize: 14,
              }}
            >
              <span>
                <span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)' }}>Later</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                  Remaining balance — when your vendor asks
                </span>
              </span>
              <span className="num" style={{ fontWeight: 700 }}>
                £{(Number(total) - Number(legacyDeposit ?? 0)).toFixed(2)}
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function ProposalStep({ proposal, busy, setBusy, onDone }: any) {
  const [error, setError] = useState('')
  const schedule = Array.isArray(proposal?.paymentSchedule) ? proposal.paymentSchedule : []
  const legacyDeposit = Number(proposal?.depositAmount ?? proposal?.deposit ?? 0)

  async function accept() {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const r = await fetch('/api/client/proposal', {
        method: 'POST',
        credentials: 'same-origin',
      })
      const data = await r.json().catch(() => ({} as { error?: string }))
      if (r.ok) {
        toast.success(
          data.agreementSent === false
            ? 'Quote accepted — your vendor will send the agreement next.'
            : 'Quote accepted — please sign the agreement next.',
        )
        onDone()
      } else setError(data.error || 'We could not accept that just now. Please try again.')
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

      {/* Full plan before Accept — schedule stages when present, else deposit + balance. */}
      <QuotePaymentSchedule
        schedule={schedule.length > 0 ? schedule : null}
        legacyDeposit={legacyDeposit}
        total={Number(proposal.price)}
      />

      {error && <div className="banner banner-error mb-3">{error}</div>}
      <Primary onClick={accept} busy={busy}>Accept quote</Primary>
      <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
        Accepting tells your vendor to send the agreement. No payment yet — you&apos;ve seen the full schedule above.
      </p>
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
      if (r.ok) {
        toast.success('Agreement signed — next you can pay your deposit.')
        onDone()
      } else setError('We could not save your signature just now. Please try again.')
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
      <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
        Your vendor is notified straight away. Deposit comes next.
      </p>
    </div>
  )
}

function stageStateLabel(state: string) {
  if (state === 'confirmed') return 'Confirmed'
  if (state === 'waiting') return 'Sent — waiting for your vendor to confirm'
  if (state === 'due') return 'Due now'
  return 'Upcoming'
}

function PaymentStep({ payment, depositLabel = 'Deposit', busy, setBusy, onDone }: any) {
  const [error, setError] = useState('')
  const [declaredMethod, setDeclaredMethod] = useState<DeclaredPaymentMethod | ''>('')
  const total = Number(payment?.total ?? 0)
  const depositDue = Number(payment?.depositDue ?? 0)
  const depositPaid = Number(payment?.depositPaid ?? 0)
  const balanceDue = Number(payment?.balanceDue ?? 0)
  const balanceRequested = !!payment?.balanceRequested
  const canPayOnline = !!payment?.stripeConfigured
  const advanceWord = depositLabel || 'Deposit'
  const schedule: any[] = Array.isArray(payment?.schedule) ? payment.schedule : []
  const hasSchedule = !!payment?.hasSchedule && schedule.length > 0

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

  if (payment?.fullyPaid) {
    return (
      <div>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>All payments confirmed</p>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
          Your vendor has confirmed everything owed for this booking.
        </p>
        {hasSchedule && (
          <ul style={{ margin: '14px 0 0', padding: 0, listStyle: 'none' }}>
            {schedule.map((s: any) => (
              <li key={s.id} style={{ fontSize: 13.5, padding: '6px 0', color: 'var(--muted)' }}>
                {s.name} · £{Number(s.amount).toFixed(2)} · Confirmed
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // --- Schedule path ---------------------------------------------------
  if (hasSchedule) {
    const dueStage = schedule.find((s: any) => s.state === 'due') || null
    const waitingStage = schedule.find((s: any) => s.state === 'waiting') || null

    const declareStage = async (stageId: string) => {
      if (busy) return
      if (!declaredMethod) {
        setError('Choose how you paid before continuing.')
        return
      }
      setError('')
      setBusy(true)
      try {
        const r = await fetch('/api/client/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stageId,
            mode: 'manual',
            declaredMethod,
          }),
        })
        if (r.ok) {
          toast.success('Payment reported — waiting for your vendor to confirm.')
          onDone()
        } else {
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
        <div className="kicker" style={{ color: 'var(--faint)', marginBottom: 8 }}>Payment schedule</div>
        <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none' }}>
          {schedule.map((s: any, i: number) => (
            <li
              key={s.id}
              style={{
                padding: '12px 0',
                borderTop: i === 0 ? undefined : '1px solid var(--line-soft)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{s.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{s.timingLabel}</div>
                </div>
                <div className="num" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                  £{Number(s.amount).toFixed(2)}
                </div>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color:
                    s.state === 'confirmed'
                      ? 'var(--success)'
                      : s.state === 'waiting' || s.state === 'due'
                        ? 'var(--coral-deep, #c45c3e)'
                        : 'var(--faint)',
                }}
              >
                {stageStateLabel(s.state)}
              </div>
            </li>
          ))}
        </ul>

        {waitingStage && (
          <div className="banner" style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
              {waitingStage.name} sent — waiting for your vendor to confirm.
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
              You told them you paid £{Number(waitingStage.pendingAmount ?? waitingStage.amount).toFixed(2)}
              {waitingStage.pendingMethod
                ? ` by ${declaredPaymentMethodLabel(waitingStage.pendingMethod)}`
                : ''}
              . This is not confirmed yet — your vendor still needs to mark it received.
            </p>
          </div>
        )}

        {dueStage && !waitingStage && (
          <>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>
              {dueStage.name} to pay
            </p>
            <p className="num" style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
              £{Number(dueStage.amount).toFixed(2)}
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '4px 0 14px' }}>
              Pay by bank/online transfer, cash, or card in person — however you agreed — then tell
              them how you paid. They confirm once it clears. This page does not take the card itself.
            </p>
            {error && <div className="banner banner-error mb-3">{error}</div>}
            <label className="label" style={{ marginBottom: 8 }}>How did you pay?</label>
            <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
              {DECLARED_PAYMENT_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${declaredMethod === opt.value ? 'var(--forest)' : 'var(--line)'}`,
                    background:
                      declaredMethod === opt.value ? 'var(--forest-soft, #e8f2f0)' : 'var(--canvas-2, #fff)',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: 'var(--ink)',
                  }}
                >
                  <input
                    type="radio"
                    name="declaredMethodSchedule"
                    value={opt.value}
                    checked={declaredMethod === opt.value}
                    onChange={() => setDeclaredMethod(opt.value)}
                    style={{ accentColor: 'var(--forest)' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <Primary
              onClick={() => declareStage(dueStage.id)}
              busy={busy}
              disabled={!declaredMethod}
            >
              I&apos;ve paid this way — notify my vendor
            </Primary>
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
              Status stays “waiting for your vendor to confirm” until they mark it received.
            </p>
          </>
        )}

        {!dueStage && !waitingStage && (
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
            You&apos;re set for now. Upcoming stages open here when your vendor asks.
          </p>
        )}
      </div>
    )
  }

  // --- Legacy DEPOSIT / FINAL ------------------------------------------
  const payType: 'DEPOSIT' | 'FINAL' =
    depositPaid > 0 && balanceDue > 0 && balanceRequested ? 'FINAL' : 'DEPOSIT'
  const amountDue = payType === 'FINAL' ? balanceDue : depositDue
  const pending =
    payType === 'FINAL' ? payment?.pendingFinal : payment?.pendingDeposit

  if (depositPaid > 0 && balanceDue > 0 && !balanceRequested && !payment?.pendingDeposit) {
    return (
      <div>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
          {advanceWord} confirmed
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
          You&apos;re set for now — next is your event. Your vendor will ask here if they need the balance later.
        </p>
      </div>
    )
  }

  if (pending) {
    const label = payType === 'FINAL' ? 'balance' : advanceWord.toLowerCase()
    return (
      <div>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
          {payType === 'FINAL'
            ? 'Balance sent — waiting for your vendor to confirm.'
            : `${advanceWord} sent — waiting for your vendor to confirm.`}
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
          You told them you paid the £{Number(pending.amount ?? amountDue).toFixed(2)} {label}
          {pending.method ? ` by ${declaredPaymentMethodLabel(pending.method)}` : ''}.
          This is not confirmed yet — your vendor still needs to mark it received.
        </p>
      </div>
    )
  }

  async function declareManual() {
    if (busy) return
    if (!declaredMethod) {
      setError('Choose how you paid before continuing.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const r = await fetch('/api/client/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: payType,
          mode: 'manual',
          declaredMethod,
        }),
      })
      if (r.ok) {
        toast.success(
          payType === 'FINAL'
            ? 'Balance reported — waiting for your vendor to confirm.'
            : `${advanceWord} reported — waiting for your vendor to confirm.`,
        )
        onDone()
      } else {
        const body = await r.json().catch(() => ({}))
        setError(body.error || 'We could not record that just now. Please try again.')
      }
    } catch {
      setError('Connection issue — please check your network and try again.')
    } finally {
      setBusy(false)
    }
  }

  const heading = payType === 'FINAL' ? 'Balance to pay' : `${advanceWord} to pay`
  const help =
    payType === 'FINAL'
      ? 'Pay the remaining balance how you agreed with your vendor, then tell them how you paid. They confirm once it clears — this page does not take the money.'
      : `Pay the ${advanceWord.toLowerCase()} how you agreed with your vendor, then tell them how you paid. They confirm once it clears — this page does not take the money.`

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>{heading}</p>
      <p className="num" style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
        £{amountDue.toFixed(2)}
      </p>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '4px 0 14px' }}>{help}</p>
      {error && <div className="banner banner-error mb-3">{error}</div>}

      {canPayOnline && (
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px' }}>
          Online card pay is available from your vendor — or report another way below.
        </p>
      )}

      <label className="label" style={{ marginBottom: 8 }}>How did you pay?</label>
      <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
        {DECLARED_PAYMENT_OPTIONS.map(opt => (
          <label
            key={opt.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${declaredMethod === opt.value ? 'var(--forest)' : 'var(--line)'}`,
              background: declaredMethod === opt.value ? 'var(--forest-soft, #e8f2f0)' : 'var(--canvas-2, #fff)',
              cursor: 'pointer',
              fontSize: 14,
              color: 'var(--ink)',
            }}
          >
            <input
              type="radio"
              name="declaredMethod"
              value={opt.value}
              checked={declaredMethod === opt.value}
              onChange={() => setDeclaredMethod(opt.value)}
              style={{ accentColor: 'var(--forest)' }}
            />
            {opt.label}
          </label>
        ))}
      </div>

      <Primary onClick={declareManual} busy={busy} disabled={!declaredMethod}>
        I&apos;ve paid this way — notify my vendor
      </Primary>
      <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
        Status stays “waiting for your vendor to confirm” until they mark it received.
      </p>
    </div>
  )
}

function ReviewStep({ busy, setBusy, onDone }: any) {
  const [overall, setOverall] = useState(0)
  const [wentWell, setWentWell] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState('')
  const [error, setError] = useState('')

  async function submit() {
    if (busy) return
    if (overall < 1 || overall > 5) {
      setError('Tap a star rating to continue.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const r = await fetch('/api/client/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overall, wentWell, wouldRecommend }),
      })
      const body = await r.json().catch(() => ({}))
      if (r.ok) {
        toast.success('Thank you — you’re all done.')
        onDone()
      } else {
        setError(body.error || 'Could not save your review — try again.')
      }
    } catch {
      setError('Connection issue — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {error && <div className="banner banner-error mb-3">{error}</div>}
      <label className="label">Overall</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }} role="group" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setOverall(n)}
            className="btn btn-ghost"
            style={{
              minHeight: 44,
              minWidth: 44,
              padding: 0,
              fontWeight: 800,
              borderColor: overall >= n ? 'var(--forest)' : undefined,
              background: overall >= n ? 'var(--forest-soft, #e8f2f0)' : undefined,
              color: overall >= n ? 'var(--forest)' : 'var(--muted)',
            }}
            aria-pressed={overall >= n}
          >
            {n}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label className="label">What went well?</label>
        <textarea
          rows={2}
          value={wentWell}
          onChange={e => setWentWell(e.target.value)}
          placeholder="Optional — a sentence is enough"
          maxLength={280}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label className="label">Anything to improve?</label>
        <textarea
          rows={2}
          value={wouldRecommend}
          onChange={e => setWouldRecommend(e.target.value)}
          placeholder="Optional — or say you’d book them again"
          maxLength={280}
        />
      </div>
      <Primary onClick={submit} busy={busy} disabled={overall < 1}>
        Submit &amp; finish
      </Primary>
    </div>
  )
}

function DeliveryApproval({ approved, busy, setBusy, onDone }: any) {
  const [error, setError] = useState('')
  if (approved) {
    return (
      <div className="banner banner-success" style={{ marginTop: 14 }}>
        Delivery approved.
      </div>
    )
  }
  async function approve() {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const r = await fetch('/api/client/complete', { method: 'POST' })
      if (r.ok) {
        toast.success('Approved — one quick review next.')
        onDone()
      } else {
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

function ClientMessages({ vendorName, quiet = false }: { vendorName: string; quiet?: boolean }) {
  const [messages, setMessages] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [sendError, setSendError] = useState('')
  const [peerTyping, setPeerTyping] = useState<{ name: string } | null>(null)

  async function loadMessages() {
    const res = await fetch('/api/client/messages')
    const parsed = await parseJsonResponse<{
      messages?: any[]
      peerTyping?: { name: string } | null
    }>(res)
    if (parsed.ok) {
      setMessages((parsed.data as any).messages || [])
      setPeerTyping(parsed.data.peerTyping || null)
    }
    setLoaded(true)
  }

  useEffect(() => { loadMessages() }, [])

  useMessagePoll({
    enabled: loaded,
    fetchMessages: async () => {
      const res = await fetch('/api/client/messages')
      const parsed = await parseJsonResponse<{
        messages?: any[]
        peerTyping?: { name: string } | null
      }>(res)
      if (!parsed.ok) return null
      setPeerTyping(parsed.data.peerTyping || null)
      return (parsed.data as any).messages || []
    },
    onMessages: setMessages,
    isInbound: m => m.type === 'vendor' || m.sender?.role === 'VENDOR',
    onInbound: inbound => {
      const last = inbound[inbound.length - 1]
      const preview = (last.content || '').trim().slice(0, 80)
      toast(`${vendorName}${preview ? `: ${preview}` : ' sent a message'}`, { id: 'client-msg-poll' })
    },
  })

  useEffect(() => {
    if (!loaded) return
    const active = draft.trim().length > 0
    const timer = setTimeout(() => {
      fetch('/api/client/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, draft }),
      })
        .then(r => parseJsonResponse<{ peerTyping?: { name: string } | null }>(r))
        .then(parsed => {
          if (parsed.ok) setPeerTyping(parsed.data.peerTyping || null)
        })
        .catch(() => {})
    }, active ? 280 : 0)
    return () => clearTimeout(timer)
  }, [draft, loaded])

  async function send() {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    setSendError('')
    setDraft('')
    setPeerTyping(null)
    fetch('/api/client/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false, draft: '' }),
    }).catch(() => {})
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
      <div className="panel" style={{ padding: quiet ? 14 : 18 }} aria-busy="true">
        <div className="h-4 w-40 animate-pulse rounded mb-3" style={{ background: 'var(--line)' }} />
        <div className="h-16 w-3/4 animate-pulse rounded-xl mb-2" style={{ background: 'var(--line)' }} />
        <div className="h-16 w-1/2 animate-pulse rounded-xl ml-auto" style={{ background: 'var(--line)' }} />
      </div>
    )
  }

  return (
    <div style={quiet ? { opacity: 0.92 } : undefined}>
      <div
        style={{
          font: quiet ? undefined : 'var(--t-h2)',
          fontSize: quiet ? 13 : undefined,
          fontWeight: quiet ? 600 : undefined,
          color: quiet ? 'var(--muted)' : undefined,
          marginBottom: quiet ? 8 : 12,
        }}
      >
        {quiet ? `Message ${vendorName}` : `Messages · ${vendorName}`}
      </div>
      <div
        className="panel"
        style={{
          padding: quiet ? 14 : 18,
          display: 'flex',
          flexDirection: 'column',
          gap: quiet ? 10 : 14,
          background: quiet ? 'var(--canvas-2)' : undefined,
          borderColor: quiet ? 'var(--line-soft)' : undefined,
        }}
      >
        <div
          className={`space-y-3.5 overflow-y-auto ${quiet ? 'max-h-44' : 'max-h-64'}`}
          aria-live="polite"
          role="log"
        >
          {messages.length === 0 ? (
            <div className="empty" style={{ padding: quiet ? '12px 4px' : '24px 8px' }}>
              <p style={{ margin: 0, fontSize: quiet ? 12.5 : 13.5, color: 'var(--muted)' }}>
                {quiet
                  ? `Still need something? Message ${vendorName} anytime.`
                  : `Quiet for now — message ${vendorName} anytime.`}
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
                <div style={{ maxWidth: 'min(74%, 100%)', minWidth: 0 }}>
                  <div className={mine ? 'ws-msg-mine' : 'ws-msg-theirs'}>
                    <p className="whitespace-pre-wrap break-words" style={{ margin: 0 }}>{m.content}</p>
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
          {peerTyping ? <TypingPreview name={peerTyping.name || vendorName} /> : null}
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
