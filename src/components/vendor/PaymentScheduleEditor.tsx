'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { parseJsonResponse } from '@/lib/safe-json'
import { MAX_PAYMENT_STAGES, validatePaymentStages } from '@/lib/payment-stage-rules'
import { declaredPaymentMethodLabel } from '@/lib/payment-declare'

type StageRow = {
  id?: string
  name: string
  amount: string
  timingLabel: string
  sortOrder: number
  requestedAt?: string | null
}

type PaymentRow = {
  id: string
  stageId?: string | null
  status: string
  type: string
  method?: string | null
  amount: number | string
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function emptyRow(order: number): StageRow {
  return {
    name: '',
    amount: '',
    timingLabel: '',
    sortOrder: order,
  }
}

function money(n: number) {
  return `£${round2(n).toFixed(2)}`
}

export default function PaymentScheduleEditor({
  projectId,
  quoteTotal,
  savedStages,
  payments,
  amountLocked,
  readOnly,
  contractSigned,
  busy,
  run,
  onChanged,
}: {
  projectId: string
  quoteTotal: number
  savedStages: Array<{
    id: string
    name: string
    amount: number | string
    timingLabel: string
    sortOrder: number
    requestedAt?: string | null
  }>
  payments: PaymentRow[]
  /** True once any COMPLETED payment exists — stages read-only. */
  amountLocked: boolean
  readOnly: boolean
  /** Confirm / request only after the client signed. */
  contractSigned: boolean
  busy: string | null
  run: (label: string, fn: () => unknown) => void
  onChanged: () => void
}) {
  const locked = amountLocked || readOnly
  const [draft, setDraft] = useState<StageRow[]>([])
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (savedStages.length === 0) {
      setDraft([])
      return
    }
    setDraft(
      savedStages.map(s => ({
        id: s.id,
        name: s.name,
        amount: String(Number(s.amount)),
        timingLabel: s.timingLabel,
        sortOrder: s.sortOrder,
        requestedAt: s.requestedAt,
      })),
    )
  }, [savedStages])

  const quote = round2(quoteTotal || 0)
  const runningTotal = useMemo(
    () => round2(draft.reduce((s, r) => s + (Number(r.amount) || 0), 0)),
    [draft],
  )
  const diff = round2(runningTotal - quote)
  const sumOk = Math.abs(diff) <= 0.005

  const liveError = useMemo(() => {
    if (draft.length === 0) return null
    const validated = validatePaymentStages(
      draft.map((r, i) => ({
        name: r.name,
        amount: Number(r.amount),
        timingLabel: r.timingLabel,
        sortOrder: i,
      })),
      quote,
    )
    return validated.ok ? null : validated.error
  }, [draft, quote])

  function updateRow(i: number, patch: Partial<StageRow>) {
    setDraft(rows => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function addRow() {
    if (draft.length >= MAX_PAYMENT_STAGES) return
    setDraft(rows => [...rows, emptyRow(rows.length)])
  }

  function removeRow(i: number) {
    setDraft(rows => rows.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, sortOrder: idx })))
  }

  async function applyDefault() {
    const res = await fetch(`/api/vendor/projects/${projectId}/payment-stages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applyDefault: true }),
    })
    const parsed = await parseJsonResponse<{ error?: string }>(res)
    if (!parsed.ok) throw new Error(parsed.data.error || 'Could not apply default schedule')
    toast.success('Default schedule applied — client will see it on the quote')
    onChanged()
  }

  async function saveSchedule() {
    const validated = validatePaymentStages(
      draft.map((r, i) => ({
        name: r.name,
        amount: Number(r.amount),
        timingLabel: r.timingLabel,
        sortOrder: i,
      })),
      quote,
    )
    if (!validated.ok) throw new Error(validated.error)
    const res = await fetch(`/api/vendor/projects/${projectId}/payment-stages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages: validated.stages }),
    })
    const parsed = await parseJsonResponse<{ error?: string }>(res)
    if (!parsed.ok) throw new Error(parsed.data.error || 'Could not save schedule')
    toast.success('Payment schedule saved')
    setEditing(false)
    onChanged()
  }

  async function requestStage(stageId: string) {
    const res = await fetch(
      `/api/vendor/projects/${projectId}/payment-stages/${stageId}/request`,
      { method: 'POST' },
    )
    const parsed = await parseJsonResponse<{ error?: string }>(res)
    if (!parsed.ok) throw new Error(parsed.data.error || 'Could not request stage')
    toast.success('Stage requested — client can report payment on their link')
    onChanged()
  }

  async function confirmStage(stageId: string) {
    const res = await fetch(
      `/api/vendor/projects/${projectId}/payment-stages/${stageId}/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    const parsed = await parseJsonResponse<{ error?: string; alreadyConfirmed?: boolean }>(res)
    if (!parsed.ok) throw new Error(parsed.data.error || 'Could not confirm')
    toast.success(
      parsed.data.alreadyConfirmed ? 'Already confirmed' : 'Payment confirmed for this stage',
    )
    onChanged()
  }

  const hasSaved = savedStages.length > 0

  function stageStatus(stageId: string) {
    const completed = payments.find(p => p.stageId === stageId && p.status === 'COMPLETED')
    if (completed) return { kind: 'confirmed' as const, payment: completed }
    const pending = payments.find(p => p.stageId === stageId && p.status === 'PENDING')
    if (pending) return { kind: 'waiting' as const, payment: pending }
    return { kind: 'open' as const, payment: null }
  }

  const summaryLine = hasSaved
    ? savedStages
        .map(s => `${s.name || s.timingLabel} ${money(Number(s.amount))}`)
        .join(' · ')
    : null

  return (
    <div className="panel" style={{ padding: 18 }}>
      <div style={{ font: 'var(--t-h2)', marginBottom: 6 }}>Payment plan</div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted)', maxWidth: '52ch' }}>
        Simple deposit + balance from your quote. Your client sees this before they accept.
      </p>

      {amountLocked && (
        <div className="banner banner-error" style={{ marginBottom: 12 }}>
          Payment amounts are locked because a payment has been confirmed on this booking.
        </div>
      )}

      {!hasSaved && !locked && (
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            className="btn btn-forest"
            disabled={!!busy || quote <= 0}
            onClick={() => run('sched-default', applyDefault)}
          >
            {busy === 'sched-default' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Apply default plan'
            )}
          </button>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
            Usually applied automatically when you send the quote.
          </p>
        </div>
      )}

      {hasSaved && !editing && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--line-soft)',
              background: 'var(--canvas-2)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink)',
            }}
          >
            {summaryLine}
          </div>
          {!locked && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 8, minHeight: 36 }}
              onClick={() => setEditing(true)}
            >
              Edit schedule
            </button>
          )}
        </div>
      )}

      {/* Stage actions (confirm / request) — always visible when saved */}
      {hasSaved && (
        <div className="space-y-3" style={{ marginBottom: editing ? 14 : 0 }}>
          {savedStages.map((row, i) => {
            const status = stageStatus(row.id)
            return (
              <div
                key={row.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid var(--line-soft)',
                  background: 'var(--panel)',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{row.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {row.timingLabel} · {money(Number(row.amount))}
                    </div>
                  </div>
                  {status.kind === 'confirmed' && (
                    <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: 12.5 }}>Confirmed</span>
                  )}
                </div>

                {status.kind === 'waiting' && (
                  <div style={{ marginTop: 10, fontSize: 12.5 }}>
                    <span style={{ color: 'var(--coral-deep)', fontWeight: 600 }}>
                      Client reported
                      {status.payment?.method
                        ? ` (${declaredPaymentMethodLabel(status.payment.method)})`
                        : ''}{' '}
                      — waiting for you
                    </span>
                    {!readOnly && contractSigned && (
                      <button
                        type="button"
                        className="btn btn-forest"
                        style={{ display: 'block', marginTop: 8, minHeight: 36 }}
                        disabled={!!busy}
                        onClick={() => run(`confirm-${row.id}`, () => confirmStage(row.id))}
                      >
                        {busy === `confirm-${row.id}` ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          'Confirm received'
                        )}
                      </button>
                    )}
                  </div>
                )}

                {status.kind === 'open' && (
                  <div style={{ marginTop: 10, fontSize: 12.5 }}>
                    {!contractSigned ? (
                      <span style={{ color: 'var(--muted)' }}>
                        Opens after the client signs the agreement
                      </span>
                    ) : i === 0 ? (
                      <>
                        <span style={{ color: 'var(--muted)' }}>
                          Open for client (no request needed)
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            className="btn"
                            style={{
                              display: 'block',
                              marginTop: 8,
                              minHeight: 36,
                              background: 'var(--panel)',
                              border: '1px solid var(--line)',
                            }}
                            disabled={!!busy}
                            onClick={() => run(`confirm-${row.id}`, () => confirmStage(row.id))}
                          >
                            Confirm received (no client report)
                          </button>
                        )}
                      </>
                    ) : row.requestedAt ? (
                      <>
                        <span style={{ color: 'var(--muted)' }}>
                          Requested — waiting for client to report
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            className="btn"
                            style={{
                              display: 'block',
                              marginTop: 8,
                              minHeight: 36,
                              background: 'var(--panel)',
                              border: '1px solid var(--line)',
                            }}
                            disabled={!!busy}
                            onClick={() => run(`confirm-${row.id}`, () => confirmStage(row.id))}
                          >
                            Confirm received (no client report)
                          </button>
                        )}
                      </>
                    ) : (
                      !readOnly && (
                        <button
                          type="button"
                          className="btn btn-forest"
                          style={{ minHeight: 36 }}
                          disabled={!!busy}
                          onClick={() => run(`req-${row.id}`, () => requestStage(row.id))}
                        >
                          {busy === `req-${row.id}` ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            'Request from client'
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Advanced edit — collapsed by default */}
      {editing && !locked && (
        <>
          <div className="space-y-3" style={{ marginBottom: 12 }}>
            {draft.map((row, i) => (
              <div
                key={row.id || `draft-${i}`}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid var(--line-soft)',
                  background: 'var(--canvas-2)',
                }}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="label">Stage name</label>
                    <input
                      value={row.name}
                      onChange={e => updateRow(i, { name: e.target.value })}
                      placeholder="e.g. On booking"
                    />
                  </div>
                  <div>
                    <label className="label">When (rough)</label>
                    <input
                      value={row.timingLabel}
                      onChange={e => updateRow(i, { timingLabel: e.target.value })}
                      placeholder="e.g. Before the event"
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <div style={{ flex: '1 1 120px' }}>
                    <label className="label">Amount (£)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={row.amount}
                      onChange={e => updateRow(i, { amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  {draft.length > 1 && (
                    <button
                      type="button"
                      className="btn"
                      style={{ minHeight: 40, background: 'transparent', border: '1px solid var(--line)' }}
                      onClick={() => removeRow(i)}
                      aria-label="Remove stage"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${sumOk ? 'var(--line-soft)' : 'var(--coral-deep, #c45c3e)'}`,
              background: sumOk ? 'var(--canvas-2)' : 'var(--coral-soft, #f8ebe6)',
            }}
          >
            <div style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Stages total </span>
              <strong className="num">£{runningTotal.toFixed(2)}</strong>
              <span style={{ color: 'var(--muted)' }}> · Quote </span>
              <strong className="num">£{quote.toFixed(2)}</strong>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: sumOk ? 'var(--success)' : 'var(--coral-deep)' }}>
              {sumOk
                ? 'Matches quote'
                : diff > 0
                  ? `Over by £${Math.abs(diff).toFixed(2)}`
                  : `Under by £${Math.abs(diff).toFixed(2)}`}
            </div>
          </div>

          {liveError && !sumOk && (
            <div className="banner banner-error" style={{ marginBottom: 10 }}>
              {liveError}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {draft.length < MAX_PAYMENT_STAGES && (
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
                onClick={addRow}
              >
                <Plus size={15} className="mr-1" /> Add stage
              </button>
            )}
            <button
              type="button"
              className="btn btn-lime"
              disabled={!!busy || !sumOk || !!liveError || draft.length === 0}
              onClick={() => run('sched-save', saveSchedule)}
            >
              {busy === 'sched-save' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Save schedule'
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!!busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {!hasSaved && locked && (
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>
          No payment plan on this booking yet.
        </p>
      )}
    </div>
  )
}
