'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, Circle, HelpCircle } from 'lucide-react'

/**
 * Stage 5 — "Your Journey". Same data flow as Stage 3/4 (every fetch
 * derives the project from the secure session; no identifier from the
 * browser). Only the presentation changed: a guided vertical timeline,
 * a clear next action with who-acts and estimated time, and payment
 * status — never a generic "dashboard".
 */

type Data = { project: any; questionnaire: any; proposal: any; contract: any; payment: any }

const STEPS = [
  { key: 'questionnaire', label: 'Complete your questionnaire', time: '5 minutes', who: 'You' },
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
      fetch('/api/client/project').then(r => r.ok ? r.json() : null),
      fetch('/api/client/questionnaire').then(r => r.ok ? r.json() : null),
      fetch('/api/client/proposal').then(r => r.ok ? r.json() : null),
      fetch('/api/client/contract').then(r => r.ok ? r.json() : null),
      fetch('/api/client/payment').then(r => r.ok ? r.json() : null),
    ])
    if (!project) { setState('invalid'); return }
    setD({
      project: project.project,
      questionnaire: questionnaire?.questionnaire ?? null,
      proposal: proposal?.proposal ?? null,
      contract: contract?.contract ?? null,
      payment: payment?.payment ?? null,
    })
    setState('ready')
  }

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/client/invite/${params.token}`, { method: 'POST' })
      if (!res.ok) { setState('invalid'); return }
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
        <h1 className="text-2xl font-medium text-ink-900">This link isn’t valid</h1>
        <p className="text-ink-600 mt-3">It may have expired or been replaced. Ask your vendor for a new link.</p>
      </div>
    </Centre>
  )

  const { project, questionnaire, proposal, contract, payment } = d
  const done = {
    questionnaire: !!questionnaire?.completedAt,
    proposal: !!proposal?.acceptedAt,
    contract: !!contract?.signedAt,
    payment: !!payment?.paid,
  }
  let current: typeof STEPS[number]['key'] | 'done' = 'done'
  if (!done.questionnaire) current = 'questionnaire'
  else if (proposal && !done.proposal) current = 'proposal'
  else if (contract && !done.contract) current = 'contract'
  else if (payment && !done.payment) current = 'payment'

  const completedCount = Object.values(done).filter(Boolean).length
  const currentStep = STEPS.find(s => s.key === current)

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-xl mx-auto px-5 py-10 sm:py-14">
        {/* Welcome */}
        <p className="text-sm text-ink-500">{project.vendor.businessName}</p>
        <h1 className="text-3xl font-medium text-ink-900 mt-1 tracking-tight">
          Welcome{project.client?.name ? `, ${project.client.name.split(' ')[0]}` : ''}.
        </h1>
        <p className="text-ink-600 mt-2 leading-relaxed">
          {project.vendor.businessName} has invited you to your {project.title.replace(/\s*\(demo\)/i, '')}.
        </p>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-ink-400 mb-1.5">
            <span>Your progress</span>
            <span>{completedCount} of {STEPS.length}</span>
          </div>
          <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
            <div className="h-full bg-sage-500 rounded-full transition-all" style={{ width: `${(completedCount / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {/* Next action band */}
        {current !== 'done' && currentStep && (
          <div className="mt-6 border border-ink-200 rounded-2xl bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-ink-400">Next step</p>
            <p className="text-ink-900 font-medium mt-1">{currentStep.label}</p>
            <div className="flex gap-4 mt-2 text-xs text-ink-500">
              <span>Who: {currentStep.who}</span>
              <span>About {currentStep.time}</span>
            </div>
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
                    ? <CheckCircle size={20} className="text-sage-600" />
                    : <Circle size={20} className={isCurrent ? 'text-ink-900' : 'text-ink-300'} />}
                  {i < STEPS.length - 1 && <div className={`w-px flex-1 my-1 ${isDone ? 'bg-sage-300' : 'bg-ink-200'}`} />}
                </div>
                <div className={`pb-6 ${isCurrent ? '' : 'opacity-70'}`}>
                  <p className={isDone ? 'text-ink-400 text-sm' : isCurrent ? 'text-ink-900 font-medium' : 'text-ink-500 text-sm'}>{s.label}</p>
                  {isCurrent && (
                    <div className="mt-3">
                      {s.key === 'questionnaire' && <Questionnaire busy={busy} setBusy={setBusy} onDone={refresh} />}
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
        {(done.contract || done.payment) && (
          <div className="mt-4 border border-ink-200 rounded-2xl bg-white p-5 text-sm">
            <p className="text-xs uppercase tracking-wide text-ink-400 mb-2">Payment</p>
            <Row k="Deposit" v={payment?.paid ? `£${Number(payment.paid.amount ?? payment.depositPaid).toFixed(2)} received` : (payment ? `£${Number(payment.depositDue).toFixed(2)} due` : '—')} />
          </div>
        )}

        {current === 'done' && (
          <div className="mt-6 border border-sage-200 bg-sage-50 rounded-2xl p-5">
            <p className="font-medium text-ink-900">You’re all set.</p>
            <p className="text-sm text-ink-600 mt-1">Everything is confirmed. {project.vendor.businessName} will be in touch about the next steps.</p>
          </div>
        )}

        {/* Help */}
        <p className="mt-8 text-xs text-ink-400 flex items-center gap-1.5">
          <HelpCircle size={13} />
          Questions? Contact {project.vendor.businessName}{project.vendor.phone ? ` on ${project.vendor.phone}` : ''}.
        </p>
      </div>
    </div>
  )
}

// ---- steps (logic unchanged from Stage 3/4) -------------------------

function Questionnaire({ busy, setBusy, onDone }: any) {
  const [style, setStyle] = useState('')
  const [notes, setNotes] = useState('')
  async function submit() {
    setBusy(true)
    const res = await fetch('/api/client/questionnaire', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { style_preference: style, notes }, complete: true }),
    })
    setBusy(false)
    if (res.ok) onDone()
  }
  return (
    <Panel>
      <Field label="Which style do you prefer?">
        <input value={style} onChange={e => setStyle(e.target.value)} className={inputCls} placeholder="e.g. warm and natural" />
      </Field>
      <Field label="Anything else we should know?">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} rows={3} />
      </Field>
      <Primary onClick={submit} busy={busy}>Submit</Primary>
    </Panel>
  )
}

function ProposalStep({ proposal, busy, setBusy, onDone }: any) {
  async function accept() { setBusy(true); const r = await fetch('/api/client/proposal', { method: 'POST' }); setBusy(false); if (r.ok) onDone() }
  return (
    <Panel>
      {proposal.description && <p className="text-ink-600 text-sm mb-3">{proposal.description}</p>}
      <p className="text-2xl font-medium text-ink-900">£{Number(proposal.price).toFixed(2)}</p>
      {Array.isArray(proposal.items) && (
        <ul className="mt-3 mb-4 space-y-1.5">
          {proposal.items.map((it: any, i: number) => (
            <li key={i} className="flex gap-2 text-sm text-ink-700"><CheckCircle size={15} className="text-sage-600 mt-0.5 shrink-0" />{it.name}</li>
          ))}
        </ul>
      )}
      <Primary onClick={accept} busy={busy}>Accept proposal</Primary>
    </Panel>
  )
}

function ContractStep({ contract, busy, setBusy, onDone }: any) {
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  async function sign() {
    setBusy(true)
    const r = await fetch('/api/client/contract', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedBy: name, consent }),
    })
    setBusy(false)
    if (r.ok) onDone()
  }
  return (
    <Panel>
      <div className="max-h-56 overflow-y-auto border border-ink-100 rounded-xl p-3 text-sm text-ink-700 whitespace-pre-wrap mb-4">{contract.content}</div>
      <label className="flex items-start gap-2 text-sm text-ink-700 mb-3">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />
        <span>By typing my name and confirming, I agree to the terms of this agreement.</span>
      </label>
      <input value={name} onChange={e => setName(e.target.value)} className={inputCls + ' mb-4'} placeholder="Type your full name" />
      <Primary onClick={sign} busy={busy} disabled={!consent || name.trim().length < 2}>Sign agreement</Primary>
    </Panel>
  )
}

function PaymentStep({ payment, busy, setBusy, onDone }: any) {
  async function pay() { setBusy(true); const r = await fetch('/api/client/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'DEPOSIT' }) }); setBusy(false); if (r.ok) onDone(); else onDone() }
  return (
    <Panel>
      <p className="text-2xl font-medium text-ink-900">£{Number(payment.depositDue).toFixed(2)}</p>
      <p className="text-xs text-ink-400 mt-1 mb-4">Your deposit secures the booking.</p>
      <Primary onClick={pay} busy={busy}>Pay deposit</Primary>
    </Panel>
  )
}

const inputCls = 'w-full border border-ink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-300'
const Centre = ({ children }: any) => <div className="min-h-screen bg-sand-50 flex items-center justify-center px-6">{children}</div>
const Panel = ({ children }: any) => <div className="border border-ink-200 rounded-xl bg-white p-4">{children}</div>
const Field = ({ label, children }: any) => <div className="mb-4"><label className="block text-sm text-ink-700 mb-1.5">{label}</label>{children}</div>
const Row = ({ k, v }: any) => <div className="flex justify-between py-1"><span className="text-ink-500">{k}</span><span className="text-ink-900">{v}</span></div>
function Primary({ onClick, busy, disabled, children }: any) {
  return (
    <button onClick={onClick} disabled={busy || disabled}
      className="w-full bg-ink-900 text-white text-sm font-medium rounded-xl py-3 disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-ink-800 transition">
      {busy && <Loader2 size={15} className="animate-spin" />}{children}
    </button>
  )
}
