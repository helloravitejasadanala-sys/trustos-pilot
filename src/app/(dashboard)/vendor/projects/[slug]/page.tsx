'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import {
  Loader2, Copy, Check, Calendar, User, MapPin, MoreVertical,
  Send, FileText, CheckCircle, Link as LinkIcon, MessageSquare,
  Eye, Bell, Gift, ChevronDown, ChevronRight, ChevronLeft, Mail, Phone,
} from 'lucide-react'
import BackLink from '@/components/vendor/BackLink'
import ClientFormModal from '@/components/vendor/ClientFormModal'
import ShareLink from '@/components/vendor/ShareLink'
import { StatusChip } from '@/components/ui'
import { markSeen } from '@/lib/unread'
import { getNextAction } from '@/lib/journey'
import {
  ARCHIVED_PREFIX, SIMPLE_JOURNEY, isTestProject, journeyProgress,
  projectProgressSummary, hasDeliverables, hasDeliveryApproval,
} from '@/lib/vendor-phase1'
import { projectTypeLabel, allDetailFields } from '@/lib/project-types'
import { humanizeActivityEvent } from '@/lib/activity-labels'
import { normalizePaymentMethod } from '@/lib/stripe-config'
import { parseJsonResponse } from '@/lib/safe-json'

const TABS = ['Overview', 'Money', 'Preparation', 'Delivery', 'Messages', 'History'] as const
type Tab = typeof TABS[number]

const WAITING_STATUSES = ['LEAD', 'QUESTIONNAIRE_SENT', 'PROPOSAL_SENT', 'CONTRACT_SENT']

export default function VendorProjectWorkspace({ params }: { params: { slug: string } }) {
  const [project, setProject] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('Overview')
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [clientModal, setClientModal] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [quote, setQuote] = useState({ method: 'manual', title: '', price: '', deposit: '', description: '' })
  const [stripeConfigured, setStripeConfigured] = useState(false)
  const [draft, setDraft] = useState('')
  // Preparation is edited as controlled state and saved with one button,
  // so values reliably persist and reload (no blur races / defaultValue drift).
  const [prep, setPrep] = useState({ eventDate: '', location: '', notes: '', moodboard: '' })
  const [gallery, setGallery] = useState({ name: 'Files', url: '' })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Read the datetime-local's live DOM value at save time as a fallback:
  // some date pickers set the value without firing React onChange.
  const prepDateRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [detail, clientRes] = await Promise.all([
      fetch(`/api/vendor/projects/${params.slug}/detail`),
      fetch('/api/vendor/clients'),
    ])
    const detailJson = await parseJsonResponse<{ project?: any; stripeConfigured?: boolean; error?: string }>(detail)
    if (!detailJson.ok || !detailJson.data.project) { setState('error'); return }
    const p = detailJson.data.project
    setProject(p)
    setStripeConfigured(!!detailJson.data.stripeConfigured)
    const clientJson = await parseJsonResponse<{ clients?: any[] }>(clientRes)
    if (clientJson.ok) setClients(clientJson.data.clients || [])
    setQuote(q => ({
      method: normalizePaymentMethod(p.paymentMethod || q.method),
      title: p.proposal?.title || q.title || `${projectTypeLabel(p.type)} package`,
      price: p.proposal ? String(p.proposal.price ?? '') : q.price,
      deposit: p.proposal ? String(p.proposal.depositAmount ?? p.proposal.deposit ?? '') : q.deposit,
      description: p.proposal?.description || q.description,
    }))
    setPrep({
      eventDate: p.eventDate ? new Date(p.eventDate).toISOString().slice(0, 16) : '',
      location: p.location || '',
      notes: (p.notes || '').replace(ARCHIVED_PREFIX, '').trim(),
      moodboard: (p.files || []).find((f: any) => f.type === 'moodboard')?.url || '',
    })
    setState('ready')
  }

  useEffect(() => { load() }, [params.slug])
  useEffect(() => {
    if (tab === 'Messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      if (project?.id) markSeen(project.id)
    }
  }, [tab, project?.id, project?.messages?.length])

  async function run(label: string, fn: () => unknown) {
    if (busy) return // guards against double-clicks firing the same action twice
    setBusy(label)
    try { await fn() } catch (e: any) { toast.error(e.message || 'Something went wrong') } finally { setBusy(null) }
  }

  async function patchProject(body: Record<string, unknown>) {
    const res = await fetch(`/api/vendor/projects/${params.slug}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const parsed = await parseJsonResponse<{ error?: string }>(res)
    if (!parsed.ok) throw new Error(parsed.data.error || 'Update failed')
    await load()
  }

  async function post(path: string, body?: any) {
    const res = await fetch(`/api/vendor/projects/${project.id}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const parsed = await parseJsonResponse<{ error?: string }>(res)
    if (!parsed.ok) throw new Error(parsed.data.error || 'Request failed')
    return parsed.data
  }

  async function sendContract() { await post('contract'); toast.success('Agreement sent'); await load() }
  async function recordPayment(type: 'DEPOSIT' | 'FINAL') { await post('payment', { type, method: quote.method }); toast.success('Payment recorded'); await load() }
  async function completeFree() { await post('payment', { free: true }); toast.success('Free collaboration confirmed'); await load() }
  async function completeDelivery() { await post('complete'); toast.success('Service marked complete'); await load() }
  async function requestReview() { await post('review-request'); toast.success('Review requested'); await load() }
  async function sendReminder() {
    await post('messages', { content: 'Just a friendly reminder — please open your secure link when you have a moment to complete the next step. Thank you!' })
    toast.success('Reminder sent')
    await load()
  }

  async function sendQuote() {
    const free = quote.method === 'free'
    const price = Number(quote.price)
    const deposit = Number(quote.deposit || 0)
    if (!quote.title.trim()) return toast.error('Add a title for the quote')
    if (!free) {
      if (isNaN(price) || price <= 0) return toast.error('Enter a valid total amount')
      if (isNaN(deposit) || deposit < 0) return toast.error('Enter a valid deposit amount')
      if (deposit > price) return toast.error('The deposit cannot be more than the total')
    }
    await post('proposal', {
      title: quote.title.trim(), description: quote.description,
      price, deposit, method: quote.method,
    })
    toast.success(free ? 'Free collaboration sent to client' : 'Quote sent to client')
    await load()
  }

  async function sendMessage() {
    const content = draft.trim()
    if (!content) return
    setDraft('')
    await run('msg', async () => {
      await post('messages', { content })
      await load()
    })
  }

  async function savePrep() {
    const rawDate = prepDateRef.current?.value || prep.eventDate
    const parsedDate = rawDate ? new Date(rawDate) : null
    await patchProject({
      eventDate: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
      location: prep.location.trim() || null,
      notes: prep.notes.trim() || null,
    })
    const currentMoodboard = (project.files || []).find((f: any) => f.type === 'moodboard')?.url || ''
    const nextMoodboard = prep.moodboard.trim()
    if (nextMoodboard && nextMoodboard !== currentMoodboard) {
      await post('link', { name: 'Mood board', url: nextMoodboard, type: 'moodboard' })
      await load()
    }
    toast.success('Preparation saved')
  }

  async function addGallery() {
    const name = gallery.name.trim() || 'Files'
    const url = gallery.url.trim()
    if (!/^https?:\/\//i.test(url)) return toast.error('Enter a link starting with http:// or https://')
    await post('link', { name, url, type: 'gallery' })
    setGallery({ name: 'Files', url: '' })
    toast.success('Deliverable link added')
    await load()
  }

  async function copyLink() {
    if (!project?.invitation?.url) return
    await navigator.clipboard.writeText(project.invitation.url)
    setCopied(true)
    toast.success('Client link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  if (state === 'loading') {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-forest-500" /></div>
  }
  if (state === 'error' || !project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="font-display text-xl text-forest-950">We couldn&apos;t find that project</h2>
        <p className="mt-2 text-sm text-forest-600">
          It may have been archived, cancelled, or opened from a different workspace. Check Projects for your active work.
        </p>
        <div className="mt-5"><BackLink href="/vendor/projects" label="Back to Projects" /></div>
      </div>
    )
  }

  const na = getNextAction(project.status)
  const progress = journeyProgress(project)
  const summary = projectProgressSummary(project)
  const deliverablesSent = hasDeliverables(project)
  const deliveryApproved = hasDeliveryApproval(project)
  const method = normalizePaymentMethod(project.paymentMethod || quote.method)
  const deposit = (project.payments || []).find((p: any) => p.type === 'DEPOSIT' && p.status === 'COMPLETED')
  const test = isTestProject(project)
  const detailsDone = !!project.questionnaire?.completedAt
  const waitingOnClient =
    WAITING_STATUSES.includes(project.status) ||
    (project.status === 'CONTRACT_SIGNED' && method === 'stripe' && !deposit)

  const primary: { label: string; action: () => Promise<void> | void } | null = (() => {
    switch (project.status) {
      case 'QUESTIONNAIRE_COMPLETED': return { label: 'Prepare & send quote', action: () => setTab('Money') }
      case 'PROPOSAL_ACCEPTED': return { label: 'Send agreement', action: sendContract }
      case 'CONTRACT_SIGNED':
        if (method === 'free') return { label: 'Confirm free collaboration', action: completeFree }
        return { label: 'Mark deposit received', action: () => recordPayment('DEPOSIT') }
      case 'DEPOSIT_PAID': return { label: 'Mark service complete', action: completeDelivery }
      case 'FULLY_PAID': return { label: 'Add delivery', action: () => setTab('Delivery') }
      case 'COMPLETED': return { label: 'Request a review', action: requestReview }
      default: return null
    }
  })()

  const priceNum = Number(quote.price)
  const depositNum = Number(quote.deposit || 0)
  const quoteError =
    quote.method === 'free' ? null :
    !quote.price ? null :
    isNaN(priceNum) || priceNum <= 0 ? 'Enter a valid total' :
    isNaN(depositNum) || depositNum < 0 ? 'Enter a valid deposit' :
    depositNum > priceNum ? 'Deposit cannot exceed the total' : null

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-5">
      <div className="mb-3 flex items-center gap-1.5 text-[13px] text-forest-500">
        <Link href="/vendor/projects" className="inline-flex items-center gap-1 hover:text-forest-900 hover:underline">
          <ChevronLeft size={14} />Projects
        </Link>
        <ChevronRight size={13} className="text-forest-300" />
        <span className="truncate text-forest-800 font-medium max-w-[220px]">{project.title}</span>
      </div>

      {/* Compact header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-forest-100 pb-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-forest-400">{projectTypeLabel(project.type)}</span>
            <StatusChip status={project.status} />
          </div>
          <h1 className="font-display text-2xl text-forest-950 mt-1 truncate">{project.title}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[13px] text-forest-600">
            <span className="inline-flex items-center gap-1.5"><User size={14} />{project.client?.name || 'No client yet'}</span>
            {project.eventDate && <span className="inline-flex items-center gap-1.5"><Calendar size={14} />{new Date(project.eventDate).toLocaleString('en-GB')}</span>}
            {project.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{project.location}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <button className="btn-secondary !min-h-[40px] px-3 py-2 text-[13px]" onClick={() => {
            const title = prompt('Project title', project.title)
            if (title?.trim()) run('edit', async () => { await patchProject({ title: title.trim() }); toast.success('Saved') })
          }}>Edit</button>
          <button onClick={() => setMenuOpen(v => !v)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-forest-100 text-forest-500 hover:bg-forest-50"><MoreVertical size={17} /></button>
          {menuOpen && (
            <div className="absolute right-0 top-11 w-44 rounded-xl border border-forest-100 bg-white shadow-elevated z-10 py-1 text-sm">
              <button className="w-full text-left px-3 py-2 hover:bg-forest-50" onClick={() => run('archive', () => patchProject({ archive: true }).then(() => toast.success('Archived')))}>Archive</button>
              {project.status !== 'CANCELLED' && <button className="w-full text-left px-3 py-2 hover:bg-forest-50" onClick={() => run('cancel', () => patchProject({ cancel: true }).then(() => toast.success('Cancelled')))}>Cancel</button>}
              {test && <button className="w-full text-left px-3 py-2 text-red-700 hover:bg-red-50" onClick={async () => {
                if (!confirm('Delete test project?')) return
                const res = await fetch(`/api/vendor/projects/${params.slug}`, { method: 'DELETE' })
                if (res.ok) { toast.success('Deleted'); window.location.href = '/vendor/projects' }
              }}>Delete test project</button>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-forest-100 mb-5 -mt-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative whitespace-nowrap px-3 py-2 text-[13px] font-medium transition-colors ${tab === t ? 'text-forest-950' : 'text-forest-500 hover:text-forest-800'}`}>
            {t}{t === 'Messages' && (project.messages?.length ? ` (${project.messages.length})` : '')}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-forest-800" />}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'Overview' && (
        <div className="space-y-4">
          {/* Operational next-action panel */}
          <div className="overflow-hidden rounded-xl border border-forest-800 bg-forest-950 text-paper-50">
            <div className="flex items-center gap-2 border-b border-forest-800/70 px-4 py-2">
              <span className={`h-1.5 w-1.5 rounded-full ${waitingOnClient ? 'bg-amber-300' : 'bg-sage-300'}`} />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-forest-300">
                {na.label} · {waitingOnClient ? 'Waiting for client' : 'Your move'}
              </span>
            </div>
            <div className="p-4">
              <p className="text-[15px] font-medium leading-snug">{na.nextAction}</p>
              {waitingOnClient ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={copyLink} className="inline-flex items-center rounded-lg bg-paper-50 px-3 py-1.5 text-[13px] font-medium text-forest-950 hover:bg-white">
                    {copied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}Copy link
                  </button>
                  {project.invitation?.url && (
                    <a href={project.invitation.url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-forest-700 px-3 py-1.5 text-[13px] font-medium text-paper-50 hover:bg-forest-900">
                      <Eye size={14} className="mr-1.5" />Preview
                    </a>
                  )}
                  <button disabled={busy === 'remind'} onClick={() => run('remind', sendReminder)} className="inline-flex items-center rounded-lg border border-forest-700 px-3 py-1.5 text-[13px] font-medium text-paper-50 hover:bg-forest-900 disabled:opacity-50">
                    <Bell size={14} className="mr-1.5" />Remind
                  </button>
                  <button onClick={() => setTab('Messages')} className="inline-flex items-center rounded-lg border border-forest-700 px-3 py-1.5 text-[13px] font-medium text-paper-50 hover:bg-forest-900">
                    <MessageSquare size={14} className="mr-1.5" />Message
                  </button>
                </div>
              ) : primary ? (
                <button disabled={!!busy} onClick={() => run('primary', async () => { await primary.action() })}
                  className="mt-3 inline-flex items-center rounded-lg bg-paper-50 px-4 py-2 text-[13px] font-semibold text-forest-950 hover:bg-white disabled:opacity-50">
                  {busy === 'primary' ? <Loader2 size={15} className="animate-spin" /> : primary.label}
                </button>
              ) : (
                <p className="mt-2 text-[13px] text-forest-300">Nothing needs your attention right now.</p>
              )}
            </div>
          </div>

          {/* Client + Project Details summary */}
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-forest-950">Client &amp; details</h2>
            <div className="mt-3 space-y-1 text-sm text-forest-700">
              <p className="inline-flex items-center gap-2"><User size={14} />{project.client?.name || 'No client attached'}</p>
              {project.client?.email && <p className="inline-flex items-center gap-2"><Mail size={14} />{project.client.email}</p>}
              {project.client?.phone && <p className="inline-flex items-center gap-2"><Phone size={14} />{project.client.phone}</p>}
              {!project.client && (
                <button className="btn-secondary mt-2" onClick={() => setClientModal(true)}>Add client</button>
              )}
            </div>

            {project.client && project.invitation?.url && (
              <div className="mt-4 border-t border-forest-100 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-forest-500 mb-2">Secure client link</p>
                <ShareLink url={project.invitation.url} businessName={project.vendor?.businessName} clientName={project.client?.name} />
              </div>
            )}

            <div className="mt-4 border-t border-forest-100 pt-4">
              {detailsDone ? (
                <div>
                  <button onClick={() => setDetailsOpen(o => !o)} className="flex w-full items-center justify-between text-left">
                    <span className="inline-flex items-center gap-2 text-forest-900 font-medium">
                      <CheckCircle size={18} className="text-forest-600" />Event Details completed
                    </span>
                    <span className="inline-flex items-center gap-1 text-[13px] text-forest-500">
                      {detailsOpen ? 'Hide' : 'View details'}
                      {detailsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                  </button>
                  {detailsOpen && (
                    <dl className="mt-3 space-y-2 text-sm">
                      {allDetailFields(project.type).map(f => {
                        const v = project.questionnaire?.answers?.[f.key]
                        if (!v) return null
                        return (
                          <div key={f.key} className="flex flex-col sm:flex-row sm:gap-3">
                            <dt className="text-forest-500 sm:w-48 shrink-0">{f.label}</dt>
                            <dd className="text-forest-900">{String(v)}</dd>
                          </div>
                        )
                      })}
                    </dl>
                  )}
                </div>
              ) : (
                <p className="text-sm text-forest-600">
                  Waiting for the client to confirm their project details from the secure link.
                </p>
              )}
            </div>
          </div>

          {/* Journey — completed / current / next */}
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-forest-950 mb-3">Project progress</h2>
            <div className="mb-4 grid gap-2 sm:grid-cols-3 text-[13px]">
              <div className="rounded-lg border border-forest-100 bg-forest-50/50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-forest-500">Completed</p>
                <p className="mt-1 text-forest-900">
                  {summary.completedLabels.length
                    ? summary.completedLabels[summary.completedLabels.length - 1]
                    : 'Not started yet'}
                </p>
              </div>
              <div className="rounded-lg border border-forest-800 bg-forest-950 px-3 py-2 text-paper-50">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-forest-300">Current step</p>
                <p className="mt-1 font-medium">{summary.currentLabel}</p>
              </div>
              <div className="rounded-lg border border-forest-100 bg-white px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-forest-500">Next step</p>
                <p className="mt-1 text-forest-900">{summary.nextLabel || '—'}</p>
              </div>
            </div>
            <div className="space-y-3">
              {SIMPLE_JOURNEY.map(step => {
                const done = progress[step.key as keyof typeof progress]
                const isCurrent = step.label === summary.currentLabel && !summary.allDone
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                      done ? 'bg-forest-600 text-white' : isCurrent ? 'bg-forest-950 text-white' : 'bg-forest-100 text-forest-500'
                    }`}>
                      {done ? '✓' : isCurrent ? '→' : '·'}
                    </div>
                    <p className={`text-base ${done || isCurrent ? 'text-forest-900 font-medium' : 'text-forest-500'}`}>
                      {step.label}
                      {isCurrent ? <span className="ml-2 text-[11px] font-semibold uppercase tracking-wider text-forest-500">Current</span> : null}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* MONEY */}
      {tab === 'Money' && (
        <div className="card p-5 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-forest-950">Payment method</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { v: 'manual', label: 'Manual', hint: 'Bank transfer or cash — you confirm receipt' },
                // Stripe only appears when a real Stripe key is configured,
                // so a placeholder can never reach the client.
                ...(stripeConfigured ? [{ v: 'stripe', label: 'Stripe', hint: 'Client pays securely online' }] : []),
                { v: 'free', label: 'Free collaboration', hint: 'No charge' },
              ].map(m => (
                <button key={m.v} onClick={() => setQuote(q => ({ ...q, method: m.v }))}
                  className={`rounded-xl border p-3 text-left transition ${quote.method === m.v ? 'border-forest-600 bg-forest-50' : 'border-forest-100 hover:border-forest-300'}`}>
                  <p className="font-medium text-forest-950 inline-flex items-center gap-1.5">
                    {m.v === 'free' && <Gift size={15} />}{m.label}
                  </p>
                  <p className="text-xs text-forest-500 mt-0.5">{m.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-forest-100 pt-5">
            <h2 className="text-lg font-semibold text-forest-950">Quote</h2>
            <div className="grid gap-3 mt-3">
              <div>
                <label className="label">Quote title <span className="text-red-400">*</span></label>
                <input value={quote.title} onChange={e => setQuote(q => ({ ...q, title: e.target.value }))} placeholder="e.g. Full-day package" />
              </div>
              {quote.method !== 'free' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Total (£) <span className="text-red-400">*</span></label>
                    <input type="number" min={0} step="0.01" inputMode="decimal" value={quote.price} onChange={e => setQuote(q => ({ ...q, price: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="label">Deposit (£)</label>
                    <input type="number" min={0} step="0.01" inputMode="decimal" value={quote.deposit} onChange={e => setQuote(q => ({ ...q, deposit: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>
              )}
              {quote.method === 'free' && (
                <div className="rounded-xl bg-forest-50 p-3 text-sm text-forest-700 inline-flex items-center gap-2">
                  <Gift size={16} className="text-forest-600" /> Free collaboration — total and deposit are set to £0.
                </div>
              )}
              <textarea value={quote.description} onChange={e => setQuote(q => ({ ...q, description: e.target.value }))} placeholder="What's included" rows={3} />
              {quoteError && <p className="text-sm text-red-600">{quoteError}</p>}
            </div>
            <button className="btn-primary mt-3" disabled={!!busy || !!quoteError} onClick={() => run('quote', sendQuote)}>
              {busy === 'quote' ? <Loader2 size={16} className="animate-spin" /> : <><FileText size={16} className="mr-2" />{project.proposal ? 'Update & resend' : 'Send quote to client'}</>}
            </button>
          </div>

          {/* Collection */}
          {project.proposal && (
            <div className="border-t border-forest-100 pt-5">
              <p className="text-sm font-semibold text-forest-500 uppercase tracking-wider">Collecting payment</p>
              {method === 'free' ? (
                <p className="text-base text-forest-800 mt-2">Free collaboration — no payment required.</p>
              ) : method === 'stripe' ? (
                <p className="text-base text-forest-800 mt-2">Your client pays online through their secure link. You can also mark a payment received manually below.</p>
              ) : (
                <p className="text-base text-forest-800 mt-2">Record payments as you receive them.</p>
              )}
              {(project.payments || []).some((p: any) => p.status === 'PENDING') && (
                <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                  Your client reported a payment. Confirm once it has cleared.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {project.status === 'CONTRACT_SIGNED' && method === 'free' && (
                  <button className="btn-primary" disabled={!!busy} onClick={() => run('free', completeFree)}><Gift size={16} className="mr-2" />Confirm free collaboration</button>
                )}
                {['CONTRACT_SIGNED'].includes(project.status) && method !== 'free' && !deposit && (
                  <button className="btn-primary" disabled={!!busy} onClick={() => run('dep', () => recordPayment('DEPOSIT'))}>Mark deposit received</button>
                )}
                {project.status === 'DEPOSIT_PAID' && (
                  <button className="btn-secondary" disabled={!!busy} onClick={() => run('final', () => recordPayment('FINAL'))}>Mark balance received</button>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-forest-100 pt-5">
            <p className="text-sm font-semibold text-forest-500 uppercase tracking-wider">Payment history</p>
            {(project.payments || []).length === 0 ? <p className="text-base text-forest-500 mt-2">No payments recorded.</p> : (
              <ul className="mt-2 space-y-2">
                {(project.payments || []).map((p: any) => (
                  <li key={p.id} className="text-base text-forest-800">{p.type} · £{Number(p.amount).toFixed(2)} · {p.status} · {p.method}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* PREPARATION */}
      {tab === 'Preparation' && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Date & time</label>
            <input ref={prepDateRef} type="datetime-local" value={prep.eventDate} onChange={e => setPrep(p => ({ ...p, eventDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Location</label>
            <input value={prep.location} onChange={e => setPrep(p => ({ ...p, location: e.target.value }))} placeholder="Venue or address" />
          </div>
          <div>
            <label className="label">Mood-board link</label>
            <input placeholder="https://..." value={prep.moodboard} onChange={e => setPrep(p => ({ ...p, moodboard: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={prep.notes} onChange={e => setPrep(p => ({ ...p, notes: e.target.value }))} rows={4} placeholder="Timings, access notes, anything to remember" />
          </div>
          <button className="btn-primary" disabled={busy === 'prep'} onClick={() => run('prep', savePrep)}>
            {busy === 'prep' ? <Loader2 size={16} className="animate-spin" /> : 'Save preparation'}
          </button>
        </div>
      )}

      {/* DELIVERY */}
      {tab === 'Delivery' && (
        <div className="card p-5 space-y-5">
          <div className="rounded-lg border border-forest-100 bg-forest-50/40 px-3 py-2 text-[13px] text-forest-700 space-y-1">
            <p><span className="font-semibold text-forest-900">Service completed:</span> {progress.service ? 'Yes' : 'Not yet'}</p>
            <p><span className="font-semibold text-forest-900">Deliverables sent:</span> {deliverablesSent ? 'Yes' : 'Not yet'}</p>
            <p><span className="font-semibold text-forest-900">Client approved:</span> {deliveryApproved ? 'Yes' : 'Waiting'}</p>
          </div>

          {project.status !== 'COMPLETED' && (
            <div>
              <button className="btn-primary" disabled={!!busy} onClick={() => run('complete', completeDelivery)}>Mark service complete</button>
              <p className="mt-1.5 text-[13px] text-forest-500">Do this once the service has taken place.</p>
            </div>
          )}
          {project.status === 'COMPLETED' && (
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-800">
              <CheckCircle size={16} className="text-forest-600" /> Service marked complete
            </p>
          )}

          <div className="border-t border-forest-100 pt-5">
            <h2 className="text-lg font-semibold text-forest-950">Deliverables</h2>
            <p className="text-[13px] text-forest-500 mb-3">Paste an external file or download link. Your client sees it on their secure page and can approve delivery.</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <input value={gallery.name} onChange={e => setGallery(g => ({ ...g, name: e.target.value }))} placeholder="Label (e.g. Files)" />
              <input value={gallery.url} onChange={e => setGallery(g => ({ ...g, url: e.target.value }))} placeholder="https://..." inputMode="url" />
              <button className="btn-primary shrink-0" disabled={busy === 'gallery' || !gallery.url.trim()} onClick={() => run('gallery', addGallery)}>
                {busy === 'gallery' ? <Loader2 size={16} className="animate-spin" /> : <><LinkIcon size={16} className="mr-2" />Add link</>}
              </button>
            </div>
            {(project.files || []).filter((f: any) => f.type === 'gallery').length > 0 && (
              <ul className="space-y-2 mt-4">
                {(project.files || []).filter((f: any) => f.type === 'gallery').map((f: any) => (
                  <li key={f.id} className="flex items-center gap-2 text-sm">
                    <LinkIcon size={14} className="text-forest-400 shrink-0" />
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-forest-800 underline underline-offset-2 truncate">{f.name}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-forest-100 pt-5">
            {deliveryApproved ? (
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-800">
                <CheckCircle size={16} className="text-forest-600" /> Client approved delivery
              </p>
            ) : deliverablesSent ? (
              <p className="text-[13px] text-forest-500">Deliverables are live. Your client can approve them from their secure page.</p>
            ) : (
              <p className="text-[13px] text-forest-500">Add a deliverable link above so your client can review and approve.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => run('archive', () => patchProject({ archive: true }).then(() => toast.success('Project archived')))}>Archive project</button>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES */}
      {tab === 'Messages' && (
        <div className="card p-5 flex flex-col" style={{ minHeight: '50vh' }}>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '55vh' }}>
            {(project.messages || []).length === 0 ? (
              <div className="flex h-full min-h-[30vh] flex-col items-center justify-center text-center">
                <MessageSquare size={28} className="text-forest-300" />
                <p className="mt-3 text-forest-700 font-medium">No messages yet</p>
                <p className="text-sm text-forest-500 mt-1">Send your client a note — it appears in their secure link too.</p>
              </div>
            ) : (
              (project.messages || []).map((m: any) => {
                const mine = (m.type === 'vendor') || (m.sender?.role === 'VENDOR')
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-forest-950 text-paper-50' : 'bg-forest-50 text-forest-900'}`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className={`mt-1 text-[11px] ${mine ? 'text-forest-300' : 'text-forest-400'}`}>
                        {mine ? 'You' : (m.sender?.name || 'Client')} · {new Date(m.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="mt-4 flex gap-2 border-t border-forest-100 pt-4">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Write a message…"
              className="flex-1"
            />
            <button className="btn-primary shrink-0 px-4" disabled={!draft.trim() || busy === 'msg'} onClick={sendMessage}>
              {busy === 'msg' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab === 'History' && (
        <div className="card p-5">
          {(project.activities || []).length === 0 ? (
            <p className="text-base text-forest-500">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {(project.activities || []).map((a: any) => (
                <li key={a.id} className="border-b border-forest-100 pb-3 last:border-0">
                  <p className="text-base text-forest-900">{humanizeActivityEvent(a.event || a.action || '')}</p>
                  <p className="text-sm text-forest-500">{new Date(a.createdAt).toLocaleString('en-GB')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {clientModal && (
        <ClientFormModal
          initial={project.client ? { id: project.client.id, name: project.client.name, email: project.client.email } : undefined}
          onClose={() => setClientModal(false)}
          onSaved={async client => {
            if (!project.client && client?.id) {
              await patchProject({ clientId: client.id }).catch(() => toast.error('Client saved, but could not attach to this project'))
            } else {
              await load()
            }
            setClientModal(false)
          }}
        />
      )}
    </div>
  )
}
