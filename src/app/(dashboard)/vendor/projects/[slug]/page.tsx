'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  Loader2, Copy, Check, MoreVertical,
  Send, FileText, Link as LinkIcon, MessageSquare,
  Eye, Gift,
} from 'lucide-react'
import BackLink from '@/components/vendor/BackLink'
import ClientFormModal from '@/components/vendor/ClientFormModal'
import ShareLink from '@/components/vendor/ShareLink'
import { WorkspaceLayout, WorkspaceTabs } from '@/components/layout'
import { markSeen } from '@/lib/unread'
import { getNextAction, isWaitingOnClient } from '@/lib/journey'
import {
  ARCHIVED_PREFIX, SIMPLE_JOURNEY, isTestProject, journeyProgress,
  projectProgressSummary, hasDeliverables, hasDeliveryApproval,
} from '@/lib/vendor-phase1'
import { projectTypeLabel, allDetailFields } from '@/lib/project-types'
import { humanizeActivityEvent } from '@/lib/activity-labels'
import { normalizePaymentMethod } from '@/lib/stripe-config'
import { parseJsonResponse } from '@/lib/safe-json'
import { useMessagePoll } from '@/hooks/useMessagePoll'

const TABS = ['Overview', 'Money', 'Prep', 'Delivery', 'Chat'] as const
type Tab = typeof TABS[number]

function markerClass(type: string | null) {
  const t = (type || '').toUpperCase()
  if (t.includes('STREAM') || t === 'LIVE_STREAM') return 'marker marker-stream'
  return 'marker marker-photo'
}

function markerLetter(type: string | null, title: string) {
  const t = (type || '').toUpperCase()
  if (t.includes('STREAM') || t === 'LIVE_STREAM') return 'S'
  if (t.includes('VIDEO')) return 'V'
  return (title || 'P').charAt(0).toUpperCase()
}

function initials(name: string | null | undefined) {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

export default function VendorProjectWorkspace({ params }: { params: { slug: string } }) {
  const [project, setProject] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('Overview')
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [clientModal, setClientModal] = useState(false)
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
    if (tab === 'Chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      if (project?.id) markSeen(project.id)
    }
  }, [tab, project?.id, project?.messages?.length])

  const projectId = project?.id as string | undefined
  const clientLabel = project?.client?.name || 'your client'

  useMessagePoll({
    enabled: state === 'ready' && tab === 'Chat' && !!projectId,
    fetchMessages: async () => {
      if (!projectId) return null
      const res = await fetch(`/api/vendor/projects/${projectId}/messages`)
      const parsed = await parseJsonResponse<{ messages?: any[] }>(res)
      if (!parsed.ok) return null
      return (parsed.data as any).messages || []
    },
    onMessages: messages => {
      setProject((prev: any) => (prev ? { ...prev, messages } : prev))
    },
    isInbound: m => m.type === 'client' || m.sender?.role === 'CLIENT',
    onInbound: inbound => {
      const last = inbound[inbound.length - 1]
      const from = last.sender?.name || clientLabel
      const preview = (last.content || '').trim().slice(0, 80)
      toast(`New message from ${from}${preview ? `: ${preview}` : ''}`, { id: 'vendor-msg-poll' })
      if (projectId) markSeen(projectId)
    },
  })

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
    toast.success('Prep saved')
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
    toast.success('Link copied — share it when you are ready')
    setTimeout(() => setCopied(false), 2000)
  }

  /** Vendor explicitly shared the link (not mere copy). */
  async function markInvitationShared() {
    if (!project?.id) return
    const res = await fetch(`/api/vendor/projects/${project.id}/invitation`, { method: 'PATCH' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Could not confirm share')
    }
    toast.success('Marked as shared — waiting for the client')
    await load()
  }

  if (state === 'loading') {
    return (
      <WorkspaceLayout>
        <div className="ws-stack" aria-busy="true" aria-label="Loading project">
          <div className="flex items-start gap-3.5">
            <div className="h-[52px] w-[52px] animate-pulse rounded-[var(--r)]" style={{ background: 'var(--line)' }} />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-28 animate-pulse rounded" style={{ background: 'var(--line)' }} />
              <div className="h-7 w-56 animate-pulse rounded" style={{ background: 'var(--line)' }} />
              <div className="h-3 w-40 animate-pulse rounded" style={{ background: 'var(--line)' }} />
            </div>
          </div>
          <div className="action animate-pulse" style={{ minHeight: 160 }} />
          <div className="panel animate-pulse" style={{ minHeight: 100, padding: 20 }} />
        </div>
      </WorkspaceLayout>
    )
  }

  if (state === 'error' || !project) {
    return (
      <WorkspaceLayout width="narrow">
        <div className="banner banner-error mb-4">We couldn&apos;t find that project</div>
        <div className="empty panel">
          <p className="serif" style={{ fontSize: 22, margin: '0 0 8px' }}>Project unavailable</p>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 16px', maxWidth: '42ch', marginInline: 'auto' }}>
            It may have been archived, cancelled, or opened from a different workspace. Check Projects for your active work.
          </p>
          <BackLink href="/vendor/projects" label="Back to Projects" />
        </div>
      </WorkspaceLayout>
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
  // After agreement: Stripe wait = client; manual/free = vendor confirms receipt.
  const waitingOnClient =
    project.status === 'CONTRACT_SIGNED'
      ? method === 'stripe' && !deposit
      : isWaitingOnClient(project.status)

  const journeySteps = SIMPLE_JOURNEY.filter(s => s.key !== 'archived')
  const currentJourneyIndex = summary.allDone
    ? journeySteps.length - 1
    : Math.max(0, summary.currentIndex)
  const stageOf = journeySteps.length
  const stageNum = currentJourneyIndex + 1

  const primary: { label: string; action: () => Promise<void> | void } | null = (() => {
    switch (project.status) {
      case 'LEAD':
        return {
          label: 'Copy link →',
          action: () => copyLink(),
        }
      case 'QUESTIONNAIRE_COMPLETED':
        return { label: na.ctaLabel || 'Review details →', action: () => setTab('Money') }
      case 'PROPOSAL_ACCEPTED':
        return { label: na.ctaLabel || 'Send agreement →', action: sendContract }
      case 'CONTRACT_SIGNED':
        if (method === 'free') return { label: 'Confirm free collaboration →', action: completeFree }
        if (method === 'manual') return { label: 'Mark deposit received →', action: () => recordPayment('DEPOSIT') }
        return null
      case 'DEPOSIT_PAID':
        return { label: na.ctaLabel || 'Mark service complete →', action: completeDelivery }
      case 'FULLY_PAID':
        return { label: na.ctaLabel || 'Add delivery →', action: () => setTab('Delivery') }
      case 'COMPLETED':
        return { label: na.ctaLabel || 'Request a review →', action: requestReview }
      default:
        return null
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

  const clientName = project.client?.name || 'your client'
  const typeLabel = projectTypeLabel(project.type)
  const eventMeta = [
    clientName !== 'your client' ? clientName : null,
    project.eventDate ? new Date(project.eventDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : null,
    project.location || null,
  ].filter(Boolean).join(' · ')

  const prepDoneCount = [prep.eventDate, prep.location, prep.moodboard, prep.notes].filter(Boolean).length
  const moneyChip = !project.proposal
    ? { label: 'To do', cls: 'chip chip-amber', hint: 'Quote not sent' }
    : method === 'free'
      ? { label: 'Free', cls: 'chip chip-success', hint: 'No payment required' }
      : deposit
        ? { label: 'Received', cls: 'chip chip-success', hint: 'Deposit in' }
        : { label: 'Awaiting', cls: 'chip chip-amber', hint: 'Awaiting transfer' }

  const paymentStatusChip = (() => {
    if (method === 'free') return <span className="chip chip-success">No payment required</span>
    if (deposit) return <span className="chip chip-success">Received</span>
    if ((project.payments || []).some((p: any) => p.status === 'PENDING')) {
      return <span className="chip chip-amber">Client reported sent</span>
    }
    if (project.proposal) return <span className="chip chip-amber">Awaiting transfer</span>
    return <span className="chip chip-muted">Not sent</span>
  })()

  const clientConfirmedPending = (project.payments || []).some((p: any) => p.status === 'PENDING')

  return (
    <WorkspaceLayout>
      {/* Project header */}
      <div className="mb-3 flex max-w-full flex-wrap items-start gap-3 md:mb-5 md:gap-3.5">
        <span
          className={markerClass(project.type)}
          style={{ width: 44, height: 44, fontSize: 17 }}
          aria-hidden
        >
          {markerLetter(project.type, project.title)}
        </span>
        <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="chip" style={{ background: 'var(--gold-soft)', color: '#7a4a1e' }}>{typeLabel}</span>
            <span className="num" style={{ fontSize: 12, color: 'var(--muted)' }}>
              Stage {stageNum} of {stageOf}
            </span>
          </div>
          <h1
            className="serif break-words"
            style={{ fontSize: 'clamp(22px, 6.5vw, 27px)', lineHeight: 1.1, margin: 0, color: 'var(--ink)' }}
          >
            {project.title}
          </h1>
          {eventMeta && (
            <p className="break-words" style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>{eventMeta}</p>
          )}
        </div>
        <div className="relative flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minHeight: 38 }}
            onClick={() => {
              const title = prompt('Project title', project.title)
              if (title?.trim()) run('edit', async () => { await patchProject({ title: title.trim() }); toast.success('Saved') })
            }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="btn btn-ghost"
            style={{ minHeight: 38, width: 38, padding: 0 }}
            aria-label="More actions"
          >
            <MoreVertical size={17} />
          </button>
          {menuOpen && (
            <div
              className="panel absolute right-0 top-11 z-10 w-44 py-1 text-sm"
              style={{ padding: '4px 0' }}
            >
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-[color:var(--canvas-2)]"
                onClick={() => run('archive', () => patchProject({ archive: true }).then(() => toast.success('Archived')))}
              >
                Archive
              </button>
              {project.status !== 'CANCELLED' && (
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-[color:var(--canvas-2)]"
                  onClick={() => run('cancel', () => patchProject({ cancel: true }).then(() => toast.success('Cancelled')))}
                >
                  Cancel
                </button>
              )}
              {test && (
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-[color:var(--coral-deep)] hover:bg-[color:var(--coral-soft)]"
                  onClick={async () => {
                    if (!confirm('Delete test project?')) return
                    const res = await fetch(`/api/vendor/projects/${params.slug}`, { method: 'DELETE' })
                    if (res.ok) { toast.success('Deleted'); window.location.href = '/vendor/projects' }
                  }}
                >
                  Delete test project
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress first: Completed → Current → Next */}
      <div className="panel mb-3 md:mb-4" style={{ padding: '14px 16px' }}>
        <div
          className="ws-journey"
          role="img"
          aria-label={`Completed: ${summary.completedLabels.slice(-1)[0] || 'Start'}. Current: ${summary.currentLabel}. Next: ${summary.nextLabel || 'Done'}`}
        >
          {journeySteps.map((step, i) => {
            const done = progress[step.key as keyof typeof progress] && i < currentJourneyIndex
            const isCurrent = i === currentJourneyIndex && !summary.allDone
            const isDoneFinal = summary.allDone && i <= currentJourneyIndex
            const filled = done || isDoneFinal
            return (
              <div key={step.key} style={{ display: 'contents' }}>
                {i > 0 && (
                  <span
                    className="ws-journey__line"
                    style={{ background: i <= currentJourneyIndex ? 'var(--forest)' : 'var(--line)' }}
                  />
                )}
                <span
                  className="ws-journey__dot num"
                  style={
                    filled
                      ? { background: 'var(--forest)', color: '#fff' }
                      : isCurrent
                        ? { background: 'var(--lime)', color: 'var(--lime-ink)', border: '2px solid var(--lime-deep)' }
                        : { background: 'var(--panel)', color: 'var(--faint)', border: '2px solid var(--line)' }
                  }
                  title={step.label}
                >
                  {filled ? '✓' : i + 1}
                </span>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
          {summary.completedLabels.length > 0 && (
            <>
              <span style={{ color: 'var(--ink)' }}>Completed</span>
              {' '}{summary.completedLabels[summary.completedLabels.length - 1]}
              {' · '}
            </>
          )}
          <span style={{ color: 'var(--ink)', fontWeight: 700 }}>Current</span>
          {' '}{summary.currentLabel}
          {summary.nextLabel ? (
            <>
              {' · '}
              <span style={{ color: 'var(--ink)' }}>Next</span>
              {' '}{summary.nextLabel}
            </>
          ) : null}
        </div>
      </div>

      <WorkspaceTabs
        tabs={TABS}
        active={tab}
        onChange={t => setTab(t as Tab)}
        badge={t =>
          t === 'Chat' && project.messages?.length
            ? `(${project.messages.length})`
            : null
        }
      />

      {/* OVERVIEW */}
      {tab === 'Overview' && (
        <div className="ws-grid">
          <div className="ws-stack">
            {/* One Clear Next Action */}
            <div>
              <div className="kicker" style={{ color: 'var(--forest)', marginBottom: 9 }}>
                Next action
              </div>
              <div className="action">
                <div className="ws-handoff">
                  <span
                    className="marker"
                    style={{
                      width: 36,
                      height: 36,
                      background: waitingOnClient ? 'var(--nav-2)' : 'var(--lime)',
                      color: waitingOnClient ? 'var(--on-dark-mut)' : 'var(--lime-ink)',
                    }}
                  >
                    V
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--on-dark-mut)' }}>Turn</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                      {waitingOnClient ? "Client's turn" : 'Your turn'}
                    </div>
                  </div>
                  <span style={{ color: 'var(--on-dark-mut)' }} aria-hidden>→</span>
                  <span
                    className="marker"
                    style={{
                      width: 36,
                      height: 36,
                      background: waitingOnClient ? 'var(--lav)' : 'var(--nav-2)',
                      color: waitingOnClient ? '#fff' : 'var(--on-dark-mut)',
                    }}
                  >
                    {initials(project.client?.name)}
                  </span>
                </div>

                <div style={{ font: 'var(--t-h1)', marginBottom: 7 }}>{na.nextAction}</div>
                <p style={{ fontSize: 13, color: 'var(--on-dark-mut)', maxWidth: '52ch', margin: '0 0 20px' }}>
                  {waitingOnClient
                    ? `${clientName} finishes this on their secure link.`
                    : primary
                      ? 'Complete this to move the project forward.'
                      : 'Nothing needs you right now.'}
                </p>

                {project.status === 'LEAD' && project.invitation?.url ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button type="button" onClick={copyLink} className="btn btn-lime" style={{ alignSelf: 'flex-start' }}>
                      {copied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                      Copy link
                    </button>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                      <a
                        href={project.invitation.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost-dark"
                        style={{ minHeight: 40 }}
                      >
                        <Eye size={14} className="mr-1.5" />Preview
                      </a>
                      <button
                        type="button"
                        disabled={busy === 'shared'}
                        onClick={() => run('shared', markInvitationShared)}
                        className="btn btn-ghost-dark"
                        style={{ minHeight: 40 }}
                      >
                        {busy === 'shared' ? <Loader2 size={15} className="animate-spin" /> : "I've shared the link"}
                      </button>
                    </div>
                    <ShareLink
                      url={project.invitation.url}
                      businessName={project.vendor?.businessName}
                      clientName={project.client?.name}
                      onShared={() => run('shared', markInvitationShared)}
                    />
                  </div>
                ) : waitingOnClient ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                    <button
                      type="button"
                      disabled={busy === 'remind'}
                      onClick={() => run('remind', sendReminder)}
                      className="btn btn-lime"
                    >
                      {busy === 'remind' ? <Loader2 size={15} className="animate-spin" /> : 'Send reminder'}
                    </button>
                    <button type="button" onClick={copyLink} className="btn btn-ghost-dark" style={{ minHeight: 40 }}>
                      {copied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                      Copy link
                    </button>
                    <button type="button" onClick={() => setTab('Chat')} className="btn btn-ghost-dark" style={{ minHeight: 40 }}>
                      <MessageSquare size={14} className="mr-1.5" />Chat
                    </button>
                  </div>
                ) : primary ? (
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => run('primary', async () => { await primary.action() })}
                    className="btn btn-lime"
                  >
                    {busy === 'primary' ? <Loader2 size={15} className="animate-spin" /> : primary.label}
                  </button>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--on-dark-mut)', margin: 0 }}>
                    Nothing needs you right now.
                  </p>
                )}
              </div>
            </div>

            {/* Client details */}
            <div>
              <div style={{ font: 'var(--t-h2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                Client details
                {detailsDone && <span className="chip chip-success">Done</span>}
              </div>
              {detailsDone ? (
                <div className="context">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {allDetailFields(project.type).map(f => {
                      const v = project.questionnaire?.answers?.[f.key]
                      if (!v) return null
                      return (
                        <div key={f.key}>
                          <div style={{ font: 'var(--t-xs)', color: 'var(--faint)' }}>{f.label}</div>
                          <div style={{ fontSize: 13.5 }}>{String(v)}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="context" style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                  Waiting for the client to confirm details on their link.
                </div>
              )}
            </div>

            {(project.activities || []).length > 0 && (
              <div>
                <div style={{ font: 'var(--t-h2)', marginBottom: 12 }}>Recent activity</div>
                <div className="panel" style={{ padding: 16 }}>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {(project.activities || []).slice(0, 5).map((a: any) => (
                      <li
                        key={a.id}
                        style={{
                          borderBottom: '1px solid var(--line-soft)',
                          paddingBottom: 10,
                          marginBottom: 10,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)' }}>
                          {humanizeActivityEvent(a.event || a.action || '')}
                        </p>
                        <p className="num" style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>
                          {new Date(a.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Context rail */}
          <div className="ws-stack" style={{ gap: 14 }}>
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span className={markerClass(project.type)} style={{ width: 40, height: 40 }}>
                  {initials(project.client?.name)}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{project.client?.name || 'No client yet'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {project.client ? 'Main contact' : 'Attach a client to share a link'}
                  </div>
                </div>
              </div>
              {!project.client ? (
                <button type="button" className="btn btn-forest-d btn-block" style={{ marginTop: 13, minHeight: 38 }} onClick={() => setClientModal(true)}>
                  Add client
                </button>
              ) : project.invitation?.url && project.status !== 'LEAD' ? (
                <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 13, minHeight: 38 }} onClick={copyLink}>
                  {copied ? 'Link copied' : 'Copy link'}
                </button>
              ) : null}
              {project.client && project.invitation?.url && project.status !== 'LEAD' && (
                <div style={{ marginTop: 12 }}>
                  {project.status === 'QUESTIONNAIRE_SENT' && !project.invitation?.openedAt && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                      Waiting for client to open the link.
                    </div>
                  )}
                  <ShareLink
                    url={project.invitation.url}
                    businessName={project.vendor?.businessName}
                    clientName={project.client?.name}
                  />
                </div>
              )}
            </div>

            <div className="context" style={{ padding: 16 }}>
              <div className="kicker" style={{ color: 'var(--faint)', marginBottom: 11 }}>At a glance</div>

              <button
                type="button"
                onClick={() => setTab('Money')}
                className="flex w-full items-center gap-2.5 border-0 bg-transparent py-2.5 text-left"
                style={{ borderTop: '1px solid var(--line-soft)', cursor: 'pointer' }}
              >
                <span className="marker" style={{ width: 30, height: 30, background: 'var(--success-soft)', color: 'var(--success)', fontSize: 13 }}>£</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Money</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{moneyChip.hint}</div>
                </div>
                <span className={moneyChip.cls}>{moneyChip.label}</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('Prep')}
                className="flex w-full items-center gap-2.5 border-0 bg-transparent py-2.5 text-left"
                style={{ borderTop: '1px solid var(--line-soft)', cursor: 'pointer' }}
              >
                <span className="marker" style={{ width: 30, height: 30, background: 'var(--gold-soft)', color: '#7a4a1e', fontSize: 12 }}>✓</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Prep</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{prepDoneCount} of 4 fields</div>
                </div>
                <span className={prepDoneCount === 4 ? 'chip chip-success' : prepDoneCount > 0 ? 'chip chip-success' : 'chip chip-muted'}>
                  {prepDoneCount === 0 ? 'To do' : prepDoneCount === 4 ? 'Ready' : 'In progress'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTab('Chat')}
                className="flex w-full items-center gap-2.5 border-0 bg-transparent py-2.5 text-left"
                style={{ borderTop: '1px solid var(--line-soft)', cursor: 'pointer' }}
              >
                <span className="marker" style={{ width: 30, height: 30, background: 'var(--coral-soft)', color: 'var(--coral-deep)', fontSize: 12 }}>✉</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Chat</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    {(project.messages || []).length
                      ? `${project.messages.length} with the client`
                      : 'No messages yet'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTab('Delivery')}
                className="flex w-full items-center gap-2.5 border-0 bg-transparent py-2.5 text-left"
                style={{ borderTop: '1px solid var(--line-soft)', cursor: 'pointer' }}
              >
                <span className="marker" style={{ width: 30, height: 30, background: 'var(--recessed)', color: 'var(--muted)', fontSize: 12 }}>⬇</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Delivery</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    {deliveryApproved
                      ? 'Client approved'
                      : deliverablesSent
                        ? 'Link sent'
                        : progress.service
                          ? 'Ready to add link'
                          : 'Opens after the service'}
                  </div>
                </div>
                {!progress.service && !deliverablesSent
                  ? <span className="chip chip-muted">Locked</span>
                  : deliveryApproved
                    ? <span className="chip chip-success">Done</span>
                    : null}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MONEY */}
      {tab === 'Money' && (
        <div className="ws-stack" style={{ maxWidth: 620 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div className="kicker" style={{ color: 'var(--faint)' }}>Amount</div>
              <div className="num" style={{ fontSize: 38, fontWeight: 800, lineHeight: 1 }}>
                {quote.method === 'free' ? '—' : quote.price ? `£${Number(quote.price || 0).toFixed(0)}` : '£—'}
              </div>
            </div>
            {paymentStatusChip}
          </div>

          <div>
            <div style={{ font: 'var(--t-xs)', fontWeight: 700, marginBottom: 10 }}>How the client pays</div>
            {[
              ...(stripeConfigured
                ? [{ v: 'stripe', label: 'Pay securely online', hint: 'Card via secure link', body: 'They pay by card on their portal. You see the payment once it clears.' }]
                : []),
              {
                v: 'manual',
                label: 'Pay manually',
                hint: 'Bank transfer or cash',
                body: `They see: Transfer ${quote.price ? `£${Number(quote.price).toFixed(0)}` : 'the quoted amount'} to your account with the project as the reference. They confirm once sent · you confirm when it lands.`,
              },
              {
                v: 'free',
                label: 'No payment required',
                hint: 'A free collaboration',
                body: 'A community collaboration — no payment. The project skips straight to preparation, and the client sees a warm “no payment needed” note.',
              },
            ].map(m => {
              const selected = quote.method === m.v
              return (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => setQuote(q => ({ ...q, method: m.v }))}
                  className={selected ? 'action-outline' : 'panel'}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: 16,
                    marginBottom: 10,
                    boxShadow: selected ? undefined : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${selected ? 'var(--forest)' : 'var(--line)'}`,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {selected && (
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--forest)' }} />
                      )}
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {m.v === 'free' && <Gift size={15} />}
                        {m.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.hint}</div>
                    </div>
                  </div>
                  {selected && (
                    <div
                      style={{
                        marginTop: 13,
                        paddingTop: 13,
                        borderTop: '1px solid var(--line-soft)',
                        fontSize: 12.5,
                        lineHeight: 1.55,
                      }}
                    >
                      <b>They see:</b> {m.body}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="panel" style={{ padding: 18 }}>
            <div style={{ font: 'var(--t-h2)', marginBottom: 12 }}>Quote</div>
            <div className="grid gap-3">
              <div>
                <label className="label">Quote title <span style={{ color: 'var(--coral)' }}>*</span></label>
                <input value={quote.title} onChange={e => setQuote(q => ({ ...q, title: e.target.value }))} placeholder="e.g. Full-day package" />
              </div>
              {quote.method !== 'free' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Total (£) <span style={{ color: 'var(--coral)' }}>*</span></label>
                    <input type="number" min={0} step="0.01" inputMode="decimal" value={quote.price} onChange={e => setQuote(q => ({ ...q, price: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="label">Deposit (£)</label>
                    <input type="number" min={0} step="0.01" inputMode="decimal" value={quote.deposit} onChange={e => setQuote(q => ({ ...q, deposit: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>
              )}
              {quote.method === 'free' && (
                <div className="banner banner-success">
                  <Gift size={16} /> Free collaboration — total and deposit are set to £0.
                </div>
              )}
              <textarea value={quote.description} onChange={e => setQuote(q => ({ ...q, description: e.target.value }))} placeholder="What's included" rows={3} />
              {quoteError && <div className="banner banner-error">{quoteError}</div>}
            </div>
            <button
              type="button"
              className="btn btn-lime"
              style={{ marginTop: 14 }}
              disabled={!!busy || !!quoteError}
              onClick={() => run('quote', sendQuote)}
            >
              {busy === 'quote' ? <Loader2 size={16} className="animate-spin" /> : <><FileText size={16} className="mr-2" />{project.proposal ? 'Update & resend' : 'Send quote to client'}</>}
            </button>
          </div>

          {project.proposal && (
            <div className="context" style={{ padding: 16 }}>
              <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 12 }}>Confirmation</div>
              {method === 'free' ? (
                <div>
                  <p style={{ fontSize: 13.5, margin: '0 0 12px' }}>Free collaboration — no payment required.</p>
                  {project.status === 'CONTRACT_SIGNED' && (
                    <button type="button" className="btn btn-forest" disabled={!!busy} onClick={() => run('free', completeFree)}>
                      <Gift size={16} className="mr-2" />Confirm free collaboration
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div className="panel" style={{ flex: '1 1 140px', minWidth: 0, padding: 12, boxShadow: 'none' }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Client confirms sent</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 13.5, fontWeight: 700, color: clientConfirmedPending || deposit ? 'var(--success)' : 'var(--muted)' }}>
                      {clientConfirmedPending || deposit ? '✓ Yes' : 'Waiting'}
                    </div>
                  </div>
                  <div className="panel" style={{ flex: '1 1 140px', minWidth: 0, padding: 12, boxShadow: 'none' }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>You confirm received</div>
                    {deposit ? (
                      <div style={{ marginTop: 5, fontSize: 13.5, fontWeight: 700, color: 'var(--success)' }}>✓ Received</div>
                    ) : ['CONTRACT_SIGNED'].includes(project.status) ? (
                      <button
                        type="button"
                        className="btn btn-forest btn-block"
                        style={{ marginTop: 5, minHeight: 34 }}
                        disabled={!!busy}
                        onClick={() => run('dep', () => recordPayment('DEPOSIT'))}
                      >
                        Mark received
                      </button>
                    ) : project.status === 'DEPOSIT_PAID' ? (
                      <button
                        type="button"
                        className="btn btn-forest btn-block"
                        style={{ marginTop: 5, minHeight: 34 }}
                        disabled={!!busy}
                        onClick={() => run('final', () => recordPayment('FINAL'))}
                      >
                        Mark balance received
                      </button>
                    ) : (
                      <div style={{ marginTop: 5, fontSize: 13, color: 'var(--muted)' }}>After the quote is accepted</div>
                    )}
                  </div>
                </div>
              )}
              {(project.payments || []).some((p: any) => p.status === 'PENDING') && (
                <div className="banner banner-offline" style={{ marginTop: 12 }}>
                  Your client reported a payment. Confirm once it has cleared.
                </div>
              )}
            </div>
          )}

          <div className="panel" style={{ padding: 18 }}>
            <div className="kicker" style={{ color: 'var(--faint)', marginBottom: 10 }}>Payment history</div>
            {(project.payments || []).length === 0 ? (
              <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>No payments recorded.</p>
            ) : (
              <ul className="space-y-2" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {(project.payments || []).map((p: any) => (
                  <li key={p.id} className="num" style={{ fontSize: 13.5, color: 'var(--ink)' }}>
                    {p.type} · £{Number(p.amount).toFixed(2)} · {p.status} · {p.method}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* PREPARATION */}
      {tab === 'Prep' && (
        <div className="panel" style={{ padding: 20, maxWidth: 620 }}>
          <div style={{ font: 'var(--t-h2)', marginBottom: 14 }}>Prep</div>
          <div className="space-y-4">
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
            <button type="button" className="btn btn-lime" disabled={busy === 'prep'} onClick={() => run('prep', savePrep)}>
              {busy === 'prep' ? <Loader2 size={16} className="animate-spin" /> : 'Save preparation'}
            </button>
          </div>
        </div>
      )}

      {/* DELIVERY */}
      {tab === 'Delivery' && (
        <div className="ws-stack" style={{ maxWidth: 620 }}>
          {!progress.service && !deliverablesSent ? (
            <div className="action" style={{ textAlign: 'center' }}>
              <span
                className="marker"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 11,
                  background: 'var(--nav-2)',
                  color: 'var(--lime)',
                  margin: '0 auto 12px',
                  fontSize: 20,
                }}
              >
                🔒
              </span>
              <div style={{ font: 'var(--t-h2)' }}>Delivery opens after the service</div>
              <p style={{ fontSize: 13, color: 'var(--on-dark-mut)', maxWidth: '40ch', margin: '5px auto 16px' }}>
                When the service is done, add your gallery link and {clientName} sees it instantly on their portal.
              </p>
              <button type="button" className="btn btn-ghost-dark" disabled>
                Add delivery link · locked
              </button>
              <div style={{ marginTop: 18 }}>
                <button
                  type="button"
                  className="btn btn-lime"
                  disabled={!!busy}
                  onClick={() => run('complete', completeDelivery)}
                >
                  Mark service complete →
                </button>
              </div>
            </div>
          ) : (
            <>
              {project.status === 'COMPLETED' || progress.service ? (
                <div className="banner banner-success">
                  Service marked complete — add the delivery link below.
                </div>
              ) : (
                <div>
                  <button type="button" className="btn btn-lime" disabled={!!busy} onClick={() => run('complete', completeDelivery)}>
                    Mark service complete →
                  </button>
                  <p style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>Do this once the service has taken place.</p>
                </div>
              )}

              <div className="panel" style={{ padding: 18 }}>
                <div style={{ font: 'var(--t-h2)', marginBottom: 6 }}>Deliverables</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
                  Paste an external file or download link. Your client sees it on their secure page and can approve delivery.
                </p>
                <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <input value={gallery.name} onChange={e => setGallery(g => ({ ...g, name: e.target.value }))} placeholder="Label (e.g. Files)" />
                  <input value={gallery.url} onChange={e => setGallery(g => ({ ...g, url: e.target.value }))} placeholder="https://..." inputMode="url" />
                  <button
                    type="button"
                    className="btn btn-forest shrink-0"
                    disabled={busy === 'gallery' || !gallery.url.trim()}
                    onClick={() => run('gallery', addGallery)}
                  >
                    {busy === 'gallery' ? <Loader2 size={16} className="animate-spin" /> : <><LinkIcon size={16} className="mr-2" />Add delivery link</>}
                  </button>
                </div>
                {(project.files || []).filter((f: any) => f.type === 'gallery').length > 0 && (
                  <ul className="mt-4 space-y-2" style={{ margin: '16px 0 0', padding: 0, listStyle: 'none' }}>
                    {(project.files || []).filter((f: any) => f.type === 'gallery').map((f: any) => (
                      <li key={f.id} className="flex items-center gap-2 text-sm">
                        <LinkIcon size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                        <a href={f.url} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 2 }} className="truncate">
                          {f.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="context" style={{ padding: 16 }}>
                {deliveryApproved ? (
                  <div className="banner banner-success" style={{ margin: 0 }}>Client approved delivery</div>
                ) : deliverablesSent ? (
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                    Deliverables are live. Your client can approve them from their secure page.
                  </p>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                    Add a deliverable link above so your client can review and approve.
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ marginTop: 12 }}
                  onClick={() => run('archive', () => patchProject({ archive: true }).then(() => toast.success('Project archived')))}
                >
                  Archive project
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* MESSAGES — polled while this tab is open */}
      {tab === 'Chat' && (
        <div>
          <div style={{ font: 'var(--t-h2)', marginBottom: 12 }}>
            Chat{project.client?.name ? ` · ${project.client.name}` : ''}
          </div>
          <div className="panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, minHeight: '50vh' }}>
            <div
              className="flex-1 space-y-3.5 overflow-y-auto"
              style={{ maxHeight: '55vh' }}
              aria-live="polite"
              role="log"
            >
              {(project.messages || []).length === 0 ? (
                <div className="empty" style={{ minHeight: '30vh' }}>
                  <MessageSquare size={28} style={{ color: 'var(--faint)', margin: '0 auto' }} />
                  <p style={{ margin: '12px 0 0', fontWeight: 600, color: 'var(--ink)' }}>No messages yet</p>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                    Send a note — it also appears on their secure link.
                  </p>
                </div>
              ) : (
                (project.messages || []).map((m: any) => {
                  const mine = (m.type === 'vendor') || (m.sender?.role === 'VENDOR')
                  return (
                    <div key={m.id} style={{ display: 'flex', gap: 10, flexDirection: mine ? 'row-reverse' : 'row' }}>
                      <span
                        className="marker"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          fontSize: 11,
                          background: mine ? 'var(--forest)' : undefined,
                          color: mine ? '#fff' : undefined,
                        }}
                      >
                        {mine ? 'V' : initials(m.sender?.name || project.client?.name)}
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
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
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
                className="btn btn-forest"
                style={{ minHeight: 44 }}
                disabled={!draft.trim() || busy === 'msg'}
                onClick={sendMessage}
              >
                {busy === 'msg' ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} className="mr-1.5" />Send</>}
              </button>
            </div>
          </div>
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
    </WorkspaceLayout>
  )
}
