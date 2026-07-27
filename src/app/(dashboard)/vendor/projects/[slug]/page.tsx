'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  Loader2, Copy, Check,
  Send, FileText, Link as LinkIcon, MessageSquare,
  Eye, Gift,
} from 'lucide-react'
import { ActionMenu, ActionMenuItem } from '@/components/ui'
import BackLink from '@/components/vendor/BackLink'
import ClientFormModal from '@/components/vendor/ClientFormModal'
import ShareLink from '@/components/vendor/ShareLink'
import VenueNoteForm from '@/components/vendor/VenueNoteForm'
import VenueMemoryPanel from '@/components/vendor/VenueMemoryPanel'
import { useVendorChrome } from '@/components/vendor/VendorShell'
import { WorkspaceLayout, WorkspaceTabs } from '@/components/layout'
import { hasUnread, markSeen } from '@/lib/unread'
import { playMessageChime } from '@/lib/notify'
import TypingPreview from '@/components/ui/TypingPreview'
import { getNextAction, isWaitingOnClient } from '@/lib/journey'
import {
  ARCHIVED_PREFIX,
  isArchivedProject,
  isTestProject,
  journeyProgress,
  projectProgressSummary,
  hasDeliverables,
  hasDeliveryApproval,
  type VendorProject,
} from '@/lib/vendor-phase1'
import { projectTypeLabel } from '@/lib/project-types'
import {
  allDetailFieldsForService,
  defaultProjectTypeForService,
  deliveryLockedCopy,
  deliveryOpenCopy,
  getServiceProfile,
  journeyStagesForService,
  prepFieldLabels,
  prepSaveLabel,
  projectTypesForService,
  resolveBookingService,
  serviceOptions,
  vendorTabLabel,
  vendorTabsForService,
  type ServiceKey,
} from '@/lib/service-profiles'
import { humanizeActivityEvent } from '@/lib/activity-labels'
import { normalizePaymentMethod } from '@/lib/stripe-config'
import { parseJsonResponse } from '@/lib/safe-json'
import { useMessagePoll } from '@/hooks/useMessagePoll'
import { useVisiblePoll } from '@/hooks/useVisiblePoll'
import { parseVendorWorkspaceTab } from '@/lib/vendor-workspace'
import { declaredPaymentMethodLabel } from '@/lib/payment-declare'
import PaymentScheduleEditor from '@/components/vendor/PaymentScheduleEditor'
import { ProjectDeleteDialog } from '@/components/vendor/ProjectDeleteDialog'
import { RenameBookingDialog } from '@/components/vendor/RenameBookingDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { canCompleteForMoney, needsScheduleBalanceRequest } from '@/lib/money-settlement'

type Tab = string

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

function VendorProjectWorkspace({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { publishProjectsList } = useVendorChrome()
  const [project, setProject] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>(() => parseVendorWorkspaceTab(searchParams.get('tab')) || 'Overview')
  const [state, setState] = useState<'loading' | 'error' | 'transient' | 'ready'>('loading')
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmKind, setConfirmKind] = useState<'archive' | 'cancel' | 'delete' | 'rename' | null>(null)
  const [clientModal, setClientModal] = useState(false)
  const [primaryService, setPrimaryService] = useState('PHOTOGRAPHY')
  const [quote, setQuote] = useState({ method: 'manual', title: '', price: '', deposit: '', description: '' })
  const [stripeConfigured, setStripeConfigured] = useState(false)
  const [draft, setDraft] = useState('')
  const [peerTyping, setPeerTyping] = useState<{ name: string } | null>(null)
  // Preparation is edited as controlled state and saved with one button,
  // so values reliably persist and reload (no blur races / defaultValue drift).
  const [prep, setPrep] = useState({ eventDate: '', location: '', notes: '', moodboard: '' })
  /** Prep location value used for venue memory lookup — set on blur / after load. */
  const [prepLookupLocation, setPrepLookupLocation] = useState('')
  const [gallery, setGallery] = useState({ name: 'Files', url: '' })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Read the datetime-local's live DOM value at save time as a fallback:
  // some date pickers set the value without firing React onChange.
  const prepDateRef = useRef<HTMLInputElement>(null)

  function selectTab(next: Tab) {
    setTab(next)
    const canonical = parseVendorWorkspaceTab(next)
    const params = new URLSearchParams(searchParams.toString())
    if (!canonical || canonical === 'Overview') params.delete('tab')
    else params.set('tab', canonical)
    const q = params.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }

  // Honour ?tab= from the URL (toast, Bell, Today, shared links).
  useEffect(() => {
    const allowed = vendorTabsForService(primaryService)
    const fromUrl = parseVendorWorkspaceTab(searchParams.get('tab'))
    if (fromUrl && allowed.includes(fromUrl)) {
      setTab(prev => (prev === fromUrl ? prev : fromUrl))
      return
    }
    if (fromUrl && !allowed.includes(fromUrl)) {
      setTab('Overview')
      const params = new URLSearchParams(searchParams.toString())
      params.delete('tab')
      const q = params.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    }
  }, [searchParams, primaryService, pathname, router])

  async function load() {
    const [detail, clientRes] = await Promise.all([
      fetch(`/api/vendor/projects/${params.slug}/detail`),
      fetch('/api/vendor/clients'),
    ])
    const detailJson = await parseJsonResponse<{
      project?: any
      primaryService?: string
      stripeConfigured?: boolean
      error?: string
      code?: string
    }>(detail)
    if (!detailJson.ok || !detailJson.data.project) {
      // Infra/DB failures must not look like "archived / wrong workspace".
      if (
        detail.status >= 500 ||
        detailJson.data?.code === 'DB_UNAVAILABLE' ||
        /something went wrong|try again|EMAXCONN|database/i.test(detailJson.data?.error || '')
      ) {
        setState('transient')
        return
      }
      setState('error')
      return
    }
    const p = detailJson.data.project
    setProject(p)
    setPrimaryService(
      resolveBookingService(
        p.service || detailJson.data.primaryService,
        p.vendor?.primaryService,
      ),
    )
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
    const nextLocation = p.location || ''
    setPrep({
      eventDate: p.eventDate ? new Date(p.eventDate).toISOString().slice(0, 16) : '',
      location: nextLocation,
      notes: (p.notes || '').replace(ARCHIVED_PREFIX, '').trim(),
      moodboard: (p.files || []).find((f: any) => f.type === 'moodboard')?.url || '',
    })
    setPrepLookupLocation(nextLocation.trim())
    setState('ready')
    // Refresh shell/Today project list so payment PENDING clears after Money actions.
    void fetch('/api/vendor/projects')
      .then(r => parseJsonResponse<{ projects?: VendorProject[] }>(r))
      .then(parsed => {
        if (parsed.ok) publishProjectsList(parsed.data.projects || [])
      })
      .catch(() => {})
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
  const slugRef = useRef(params.slug)
  const tabRef = useRef(tab)
  slugRef.current = params.slug
  tabRef.current = tab

  useMessagePoll({
    enabled: state === 'ready' && tab === 'Chat' && !!projectId,
    fetchMessages: async () => {
      if (!projectId) return null
      const res = await fetch(`/api/vendor/projects/${projectId}/messages`)
      const parsed = await parseJsonResponse<{
        messages?: any[]
        peerTyping?: { name: string } | null
      }>(res)
      if (!parsed.ok) return null
      setPeerTyping(parsed.data.peerTyping || null)
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
      playMessageChime()
      if (projectId) markSeen(projectId)
    },
  })

  // Soft detail refresh for payment declare / signed agreement / files — not a full
  // load() (that would stomp Prep/Money draft fields and re-fetch clients).
  // Visible-only, 8s; Chat messages stay owned by useMessagePoll (5s).
  useVisiblePoll({
    enabled: state === 'ready',
    intervalMs: 8000,
    tick: async () => {
      const slug = slugRef.current
      const res = await fetch(`/api/vendor/projects/${slug}/detail`)
      const detailJson = await parseJsonResponse<{
        project?: any
        stripeConfigured?: boolean
        code?: string
      }>(res)
      if (!detailJson.ok || !detailJson.data.project) return
      const p = detailJson.data.project
      setStripeConfigured(!!detailJson.data.stripeConfigured)
      setProject((prev: any) => {
        if (!prev) return p
        const keepChat =
          tabRef.current === 'Chat' && Array.isArray(prev.messages)
        return {
          ...p,
          messages: keepChat ? prev.messages : (p.messages ?? prev.messages),
        }
      })
    },
  })

  // Heartbeat while composing — drives the client's "typing" preview.
  useEffect(() => {
    if (!projectId || tab !== 'Chat') return
    const active = draft.trim().length > 0
    const timer = setTimeout(() => {
      fetch(`/api/vendor/projects/${projectId}/typing`, {
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
  }, [draft, projectId, tab])

  async function run(label: string, fn: () => unknown) {
    if (busy) {
      toast.error('Still finishing the last action…')
      return
    }
    setBusy(label)
    try {
      await fn()
    } catch (e: any) {
      toast.error(e.message || 'That didn’t work — check your connection and try again')
    } finally {
      setBusy(null)
    }
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

  async function sendContract() {
    await post('contract')
    toast.success('Agreement sent — your client can sign it on their link now')
    await load()
  }
  async function recordPayment(type: 'DEPOSIT' | 'FINAL') {
    await post('payment', { type, method: quote.method })
    toast.success(
      type === 'DEPOSIT'
        ? `${serviceProfile.depositLabel} confirmed — you can prepare for the day`
        : 'Balance confirmed — booking money is settled',
    )
    await load()
  }
  async function requestBalance() {
    await post('payment', { requestBalance: true })
    toast.success('Balance requested — your client can report it on their link now')
    await load()
  }
  async function completeFree() {
    await post('payment', { free: true })
    toast.success('Free collaboration confirmed — no payment needed')
    await load()
  }
  async function completeDelivery() {
    await post('complete')
    toast.success('Marked complete — this booking is finished on your side')
    await load()
  }
  async function requestReview() {
    await post('review-request')
    toast.success('Review request noted — ask your client when you’re ready')
    await load()
  }
  async function archiveBooking() {
    await patchProject({ archive: true })
    toast.success('Booking archived — find it under Archived')
    await load()
  }
  async function restoreBooking() {
    await patchProject({ unarchive: true })
    toast.success('Booking restored to your active list')
    await load()
  }
  async function sendReminder() {
    await post('messages', { content: 'Just a friendly reminder — please open your secure link when you have a moment to complete the next step. Thank you!' })
    toast.success('Reminder sent — they’ll see it on their booking page')
    await load()
  }

  async function sendQuote() {
    const free = quote.method === 'free'
    const price = Number(quote.price)
    const depositAmt = Number(quote.deposit || 0)
    const locked = (project?.payments || []).some(
      (p: any) => p.status === 'COMPLETED' && (p.type === 'DEPOSIT' || p.method === 'free'),
    )
    if (!quote.title.trim()) return toast.error('Add a title for the quote')
    if (!free && !locked) {
      if (isNaN(price) || price <= 0) return toast.error('Enter a valid total amount')
      if (isNaN(depositAmt) || depositAmt <= 0) {
        return toast.error('Enter a deposit greater than £0, or choose Free collaboration.')
      }
      if (depositAmt > price) return toast.error('The deposit cannot be more than the total')
    }
    await post('proposal', {
      title: quote.title.trim(), description: quote.description,
      price, deposit: depositAmt, method: quote.method,
    })
    toast.success(
      free
        ? 'Sent — your client will see this on their booking page'
        : locked
          ? 'Quote text updated — amounts stay locked'
          : 'Quote sent — your client can review and accept it now',
    )
    await load()
  }

  async function sendMessage() {
    const content = draft.trim()
    if (!content) return
    setDraft('')
    setPeerTyping(null)
    if (projectId) {
      fetch(`/api/vendor/projects/${projectId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false, draft: '' }),
      }).catch(() => {})
    }
    await run('msg', async () => {
      await post('messages', { content })
      await load()
    })
  }

  const lastClientMessageAt = (project?.messages || [])
    .filter((m: any) => m.type === 'client' || m.sender?.role === 'CLIENT')
    .map((m: any) => m.createdAt)
    .pop() as string | undefined
  const chatUnread = project?.id ? hasUnread(project.id, lastClientMessageAt) : false

  async function savePrep() {
    const rawDate = prepDateRef.current?.value || prep.eventDate
    const parsedDate = rawDate ? new Date(rawDate) : null
    const musicOrMood = prep.moodboard.trim()
    const isUrl = /^https?:\/\//i.test(musicOrMood)
    const isMusic = prepFields.includes('music')
    // Free-text music/look notes are not URLs — keep them in project notes.
    let notes = prep.notes.trim()
    if (musicOrMood && !isUrl) {
      const label = isMusic ? 'Music / set notes' : 'Look / inspiration notes'
      const block = `${label}:\n${musicOrMood}`
      notes = notes.includes(musicOrMood) ? notes : [notes, block].filter(Boolean).join('\n\n')
    }
    await patchProject({
      eventDate: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
      location: prep.location.trim() || null,
      notes: notes || null,
    })
    const currentMoodboard = (project.files || []).find((f: any) => f.type === 'moodboard')?.url || ''
    if (musicOrMood && isUrl && musicOrMood !== currentMoodboard) {
      await post('link', {
        name: isMusic ? 'Music link' : 'Mood board',
        url: musicOrMood,
        type: 'moodboard',
      })
      await load()
    }
    toast.success('Preparation saved — you’re set for the day')
  }

  async function addGallery() {
    const name = gallery.name.trim() || 'Files'
    const url = gallery.url.trim()
    if (!/^https?:\/\//i.test(url)) return toast.error('Enter a link starting with http:// or https://')
    const fileType = getServiceProfile(primaryService).features.deliverableKind === 'recording'
      ? 'recording'
      : 'gallery'
    await post('link', { name, url, type: fileType })
    setGallery({ name: 'Files', url: '' })
    toast.success('Link added — your client can open it on their page now')
    await load()
  }

  async function copyLink() {
    if (!project?.invitation?.url) return
    await navigator.clipboard.writeText(project.invitation.url)
    setCopied(true)
    toast.success('Booking link copied — send it to your client when you’re ready')
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
    toast.success('Marked as shared — waiting for your client to open the link')
    await load()
  }

  if (state === 'loading') {
    return (
      <WorkspaceLayout>
        <div className="ws-stack" aria-busy="true" aria-label="Loading booking">
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

  if (state === 'transient') {
    return (
      <WorkspaceLayout width="narrow">
        <div className="banner banner-error mb-4">Temporary problem</div>
        <div className="empty panel">
          <p className="serif" style={{ fontSize: 22, margin: '0 0 8px' }}>Something went wrong</p>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 16px', maxWidth: '42ch', marginInline: 'auto' }}>
            Please try again in a moment. Your bookings are safe — this is a temporary connection issue, not a problem with this booking.
          </p>
          <button type="button" className="btn btn-forest" onClick={() => { setState('loading'); load() }}>
            Try again
          </button>
        </div>
      </WorkspaceLayout>
    )
  }

  if (state === 'error' || !project) {
    return (
      <WorkspaceLayout width="narrow">
        <div className="banner banner-error mb-4">We couldn&apos;t open that booking</div>
        <div className="empty panel">
          <p className="serif" style={{ fontSize: 22, margin: '0 0 8px' }}>Booking unavailable</p>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 16px', maxWidth: '42ch', marginInline: 'auto' }}>
            It may be archived, cancelled, or from another workspace. Your active bookings are still safe — open Projects to continue.
          </p>
          <BackLink href="/vendor/projects" label="Back to bookings" />
        </div>
      </WorkspaceLayout>
    )
  }

  const serviceProfile = getServiceProfile(primaryService)
  const tabs = vendorTabsForService(primaryService)
  const na = getNextAction(project.status, primaryService)
  const progress = journeyProgress(project, primaryService)
  const summary = projectProgressSummary(project, primaryService)
  const deliverablesSent = hasDeliverables(project)
  const deliveryApproved = hasDeliveryApproval(project)
  const archived = isArchivedProject(project)
  /** COMPLETED + client review — lock client-facing mutations; chat + venue notes stay open. */
  const vendorClosed = project.status === 'COMPLETED' && !!project.review
  const method = normalizePaymentMethod(project.paymentMethod || quote.method)
  const deposit = (project.payments || []).find((p: any) => p.type === 'DEPOSIT' && p.status === 'COMPLETED')
  const pendingDeposit = (project.payments || []).find(
    (p: any) => p.type === 'DEPOSIT' && p.status === 'PENDING',
  )
  const pendingFinal = (project.payments || []).find(
    (p: any) => (p.type === 'FINAL' || p.type === 'INSTALMENT') && p.status === 'PENDING',
  )
  const balanceRequested = !!project.balanceRequestedAt
  const proposalPrice = Number(project.proposal?.price ?? quote.price ?? 0)
  const proposalDeposit = Number(
    project.proposal?.depositAmount ?? project.proposal?.deposit ?? quote.deposit ?? 0,
  )
  const finalCompleted = (project.payments || []).some(
    (p: any) => (p.type === 'FINAL' || p.type === 'INSTALMENT') && p.status === 'COMPLETED',
  )
  const balanceOutstanding =
    method !== 'free' &&
    proposalPrice > 0 &&
    proposalDeposit < proposalPrice &&
    !!deposit &&
    !finalCompleted &&
    project.status !== 'FULLY_PAID' &&
    project.status !== 'COMPLETED'
  /** Amounts locked after a COMPLETED deposit or free settlement. */
  const moneyLocked = (project.payments || []).some(
    (p: any) => p.status === 'COMPLETED' && (p.type === 'DEPOSIT' || p.method === 'free'),
  )
  /** Stage amounts lock once any COMPLETED payment exists (matches payment-stages API). */
  const stagesAmountLocked = (project.payments || []).some(
    (p: any) => p.status === 'COMPLETED',
  )
  const paymentStages = Array.isArray(project.paymentStages) ? project.paymentStages : []
  const hasPaymentSchedule = paymentStages.length > 0
  const test = isTestProject(project)
  const detailsDone = !!project.questionnaire?.completedAt
  // After agreement: Stripe wait = client; manual/free = vendor confirms receipt.
  const waitingOnClient =
    project.status === 'CONTRACT_SIGNED'
      ? method === 'stripe' && !deposit
      : isWaitingOnClient(project.status, primaryService)

  const journeySteps = journeyStagesForService(primaryService)
  const currentJourneyIndex = summary.allDone
    ? journeySteps.length - 1
    : Math.max(0, summary.currentIndex)
  const stageOf = journeySteps.length
  const stageNum = currentJourneyIndex + 1

  const primary: { label: string; action: () => Promise<void> | void } | null = (() => {
    if (archived) {
      return { label: 'Restore booking →', action: restoreBooking }
    }
    if (vendorClosed) {
      return { label: 'Archive booking →', action: () => setConfirmKind('archive') }
    }
    switch (project.status) {
      case 'LEAD':
        return {
          label: 'Copy link →',
          action: () => copyLink(),
        }
      case 'QUESTIONNAIRE_COMPLETED':
        return { label: na.ctaLabel || 'Review details →', action: () => selectTab('Money') }
      case 'PROPOSAL_ACCEPTED':
        return { label: na.ctaLabel || 'Send agreement →', action: sendContract }
      case 'CONTRACT_SIGNED':
        if (method === 'free') return { label: 'Confirm free collaboration →', action: completeFree }
        // Schedule bookings: never legacy DEPOSIT confirm — that skips stageId and desyncs the client.
        if (hasPaymentSchedule) {
          return { label: 'Open Money →', action: () => selectTab('Money') }
        }
        if (method === 'manual') {
          return {
            label: `Mark ${serviceProfile.depositLabel.toLowerCase()} received →`,
            action: () => recordPayment('DEPOSIT'),
          }
        }
        return null
      case 'DEPOSIT_PAID': {
        const moneyOk = canCompleteForMoney({
          status: project.status,
          stages: paymentStages,
          payments: project.payments || [],
          quoteTotal: Number(project.proposal?.price ?? 0),
          depositAmount: Number(
            project.proposal?.depositAmount ?? project.proposal?.deposit ?? 0,
          ),
        }).ok
        if (hasPaymentSchedule && !moneyOk) {
          return { label: 'Request balance →', action: () => selectTab('Money') }
        }
        if (serviceProfile.features.showPrep) {
          return {
            label: na.ctaLabel || 'Open preparation →',
            action: () => selectTab('Prep'),
          }
        }
        return { label: na.ctaLabel || 'Mark service complete →', action: completeDelivery }
      }
      case 'FULLY_PAID':
        if (serviceProfile.features.showDelivery) {
          return { label: na.ctaLabel || 'Add delivery →', action: () => selectTab('Delivery') }
        }
        return { label: na.ctaLabel || 'Mark service complete →', action: completeDelivery }
      case 'COMPLETED': {
        const rescueBalance = needsScheduleBalanceRequest({
          status: project.status,
          paymentMethod: method,
          stages: paymentStages,
          payments: project.payments || [],
        })
        if (rescueBalance) {
          return { label: 'Request balance →', action: () => selectTab('Money') }
        }
        if (serviceProfile.features.showDelivery && !deliverablesSent) {
          return { label: na.ctaLabel || 'Add delivery →', action: () => selectTab('Delivery') }
        }
        return { label: na.ctaLabel || 'Request a review →', action: requestReview }
      }
      default:
        return null
    }
  })()

  const priceNum = Number(quote.price)
  const depositNum = Number(quote.deposit || 0)
  const quoteError =
    moneyLocked ? null :
    quote.method === 'free' ? null :
    !quote.price ? null :
    isNaN(priceNum) || priceNum <= 0 ? 'Enter a valid total' :
    isNaN(depositNum) || depositNum <= 0
      ? 'Enter a deposit greater than £0, or choose Free collaboration.'
      : depositNum > priceNum ? 'Deposit cannot exceed the total' : null

  const clientName = project.client?.name || 'your client'
  const typeLabel = projectTypeLabel(project.type)
  const eventMeta = [
    clientName !== 'your client' ? clientName : null,
    project.eventDate ? new Date(project.eventDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : null,
    project.location || null,
  ].filter(Boolean).join(' · ')

  const prepFields = serviceProfile.features.prepFields
  const prepDoneCount = prepFields.filter(f => {
    if (f === 'eventDate') return !!prep.eventDate
    if (f === 'location') return !!prep.location
    if (f === 'moodboard' || f === 'music') return !!prep.moodboard
    if (f === 'notes' || f === 'equipment') return !!prep.notes
    return false
  }).length
  const moneyChip = !project.proposal
    ? { label: 'To do', cls: 'chip chip-amber', hint: 'Quote not sent' }
    : method === 'free'
      ? { label: 'Free', cls: 'chip chip-success', hint: 'No payment required' }
      : deposit
        ? { label: 'Received', cls: 'chip chip-success', hint: `${serviceProfile.depositLabel} in` }
        : { label: 'Awaiting', cls: 'chip chip-amber', hint: `Awaiting ${serviceProfile.depositLabel.toLowerCase()}` }

  const pendingPayment = pendingDeposit || pendingFinal || null
  const paymentStatusChip = (() => {
    if (method === 'free') return <span className="chip chip-success">No payment required</span>
    if (pendingPayment) {
      const kind =
        pendingPayment.type === 'FINAL' || pendingPayment.type === 'INSTALMENT'
          ? 'balance'
          : serviceProfile.depositLabel.toLowerCase()
      return <span className="chip chip-amber">Client reported {kind} · waiting on you</span>
    }
    if (deposit && balanceOutstanding && balanceRequested) {
      return <span className="chip chip-amber">Balance requested · waiting on client</span>
    }
    if (deposit && balanceOutstanding && !balanceRequested) {
      return <span className="chip chip-success">{serviceProfile.depositLabel} received</span>
    }
    if (deposit) {
      return <span className="chip chip-success">{serviceProfile.depositLabel} received</span>
    }
    if (project.proposal) return <span className="chip chip-amber">Awaiting transfer</span>
    return <span className="chip chip-muted">Not sent</span>
  })()

  const clientConfirmedPending = !!pendingPayment

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
            <span className="chip" style={{ background: 'var(--forest-soft, #e8f2f0)', color: 'var(--forest)' }}>
              {serviceProfile.label}
            </span>
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
          {(archived || vendorClosed) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {archived && <span className="chip chip-muted">Archived</span>}
              {vendorClosed && <span className="chip chip-success">Closed</span>}
            </div>
          )}
        </div>
        <div className="relative flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minHeight: 38 }}
            onClick={() => setConfirmKind('rename')}
          >
            Rename
          </button>
          <ActionMenu
            closeKey={tab}
            disabled={!!busy}
            ariaLabel="More actions"
            triggerClassName="btn btn-ghost"
            triggerStyle={{ minHeight: 38, width: 38, padding: 0 }}
          >
            {({ close }) => (
              <>
                {archived ? (
                  <ActionMenuItem
                    onSelect={() => {
                      close()
                      void run('restore', restoreBooking)
                    }}
                  >
                    Restore
                  </ActionMenuItem>
                ) : (
                  <ActionMenuItem
                    onSelect={() => {
                      close()
                      setConfirmKind('archive')
                    }}
                  >
                    Archive
                  </ActionMenuItem>
                )}
                {project.status !== 'CANCELLED' && (
                  <ActionMenuItem
                    onSelect={() => {
                      close()
                      setConfirmKind('cancel')
                    }}
                  >
                    Cancel
                  </ActionMenuItem>
                )}
                {test && (
                  <ActionMenuItem
                    tone="danger"
                    onSelect={() => {
                      close()
                      setConfirmKind('delete')
                    }}
                  >
                    Delete test project
                  </ActionMenuItem>
                )}
              </>
            )}
          </ActionMenu>
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
        tabs={tabs}
        active={tabs.includes(tab) ? tab : 'Overview'}
        onChange={t => selectTab(t)}
        labelFor={t => vendorTabLabel(t, primaryService)}
        badge={t => {
          if (t !== 'Chat') return null
          if (chatUnread) return 'new'
          return null
        }}
      />

      {/* OVERVIEW */}
      {tab === 'Overview' && (
        <div className="ws-grid">
          <div className="ws-stack">
            {/* One Clear Next Action */}
            <div>
              <div className="kicker" style={{ color: 'var(--forest)', marginBottom: 9 }}>
                Do this next
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
                    <div style={{ fontSize: 11, color: 'var(--on-dark-mut)' }}>Who acts</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                      {waitingOnClient ? 'Waiting on client' : 'Now with you'}
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

                <div style={{ font: 'var(--t-h1)', marginBottom: 7 }}>
                  {archived
                    ? 'Archived'
                    : vendorClosed
                      ? 'Booking closed'
                      : na.nextAction}
                </div>
                <p style={{ fontSize: 13, color: 'var(--on-dark-mut)', maxWidth: '52ch', margin: '0 0 20px' }}>
                  {archived
                    ? 'On your Archived shelf — Restore puts it back on the active list. Venue notes and chat stay available.'
                    : vendorClosed
                      ? 'Client reviewed. Money, Prep, and Delivery are read-only. Chat stays open. Archive when you want it off the active list.'
                      : waitingOnClient
                        ? `${clientName} finishes this on their secure link. You’re in control — nothing else to do here.`
                        : primary
                          ? 'Do this next. One step — then the booking moves forward.'
                          : 'No bookings need you on this one right now.'}
                </p>

                {archived || vendorClosed ? (
                  <div>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => run('primary', async () => { await primary!.action() })}
                      className="btn btn-lime"
                    >
                      {busy === 'primary' ? <Loader2 size={15} className="animate-spin" /> : primary!.label}
                    </button>
                    <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--on-dark-mut)', maxWidth: '46ch' }}>
                      {archived
                        ? 'Restoring does not change the booking — it only returns it to Active.'
                        : 'Archiving hides it from Today and Active. You can Restore anytime.'}
                    </p>
                    <button type="button" onClick={() => selectTab('Chat')} className="btn btn-ghost-dark" style={{ minHeight: 40, marginTop: 12 }}>
                      <MessageSquare size={14} className="mr-1.5" />Open chat
                    </button>
                  </div>
                ) : project.status === 'LEAD' && project.invitation?.url ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--on-dark-mut)', maxWidth: '48ch' }}>
                      Send this secure link to {clientName} now — they open it without creating an account.
                    </p>
                    <ShareLink
                      url={project.invitation.url}
                      businessName={project.vendor?.businessName}
                      clientName={project.client?.name}
                      onShared={() => run('shared', markInvitationShared)}
                    />
                    <button
                      type="button"
                      disabled={busy === 'shared'}
                      onClick={() => run('shared', markInvitationShared)}
                      className="btn btn-ghost-dark"
                      style={{ minHeight: 40, alignSelf: 'flex-start' }}
                    >
                      {busy === 'shared' ? <Loader2 size={15} className="animate-spin" /> : "I've shared the link"}
                    </button>
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
                    <button type="button" onClick={() => selectTab('Chat')} className="btn btn-ghost-dark" style={{ minHeight: 40 }}>
                      <MessageSquare size={14} className="mr-1.5" />Chat
                    </button>
                  </div>
                ) : primary ? (
                  <div>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => run('primary', async () => { await primary.action() })}
                      className="btn btn-lime"
                    >
                      {busy === 'primary' ? <Loader2 size={15} className="animate-spin" /> : primary.label}
                    </button>
                    <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--on-dark-mut)', maxWidth: '46ch' }}>
                      {/agreement/i.test(primary.label)
                        ? 'They sign on their secure page. Nothing is charged from this button.'
                        : /payment|deposit|received|advance/i.test(primary.label)
                          ? 'Only confirm when the money is in your account.'
                          : 'One clear step — then this booking moves forward.'}
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--on-dark-mut)', margin: 0 }}>
                    No bookings need you on this one right now.
                  </p>
                )}
              </div>
            </div>

            {project.review && (
              <div className="panel" style={{ padding: 18, maxWidth: 520 }}>
                <div className="kicker" style={{ color: 'var(--forest)', marginBottom: 8 }}>Client review</div>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--muted)' }}>
                  Private to you — not published anywhere.
                </p>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>
                  {project.review.overall}/5
                </div>
                {project.review.wentWell?.trim() && (
                  <p style={{ margin: '0 0 8px', fontSize: 13.5, color: 'var(--ink)' }}>
                    <span style={{ color: 'var(--muted)' }}>Went well: </span>
                    {project.review.wentWell}
                  </p>
                )}
                {project.review.wouldRecommend?.trim() && (
                  <p style={{ margin: '0 0 8px', fontSize: 13.5, color: 'var(--ink)' }}>
                    <span style={{ color: 'var(--muted)' }}>Improve / book again: </span>
                    {project.review.wouldRecommend}
                  </p>
                )}
                {(project.status === 'COMPLETED' || deliveryApproved) && (
                  <div className="banner banner-success" style={{ marginTop: 12 }}>
                    Booking closed on the client side — review captured.
                  </div>
                )}
              </div>
            )}

            {/* Per-booking service — changeable until quote is accepted */}
            {!['PROPOSAL_ACCEPTED', 'CONTRACT_SENT', 'CONTRACT_SIGNED', 'DEPOSIT_PAID', 'FULLY_PAID', 'COMPLETED', 'CANCELLED'].includes(project.status) && (
              <div className="panel" style={{ padding: 16, maxWidth: 520 }}>
                <div style={{ font: 'var(--t-h2)', marginBottom: 6 }}>Service for this booking</div>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--muted)' }}>
                  Photography today, livestream tomorrow — each booking can be different. Prep and the client questionnaire follow this choice.
                </p>
                <select
                  value={primaryService}
                  className="w-full max-w-full"
                  onChange={e => {
                    const next = e.target.value as ServiceKey
                    const nextType = projectTypesForService(next).some(t => t.value === project.type)
                      ? project.type
                      : defaultProjectTypeForService(next)
                    run('service', async () => {
                      await patchProject({ service: next, type: nextType })
                      toast.success(`This booking is now ${getServiceProfile(next).label}`)
                      await load()
                    })
                  }}
                >
                  {serviceOptions().map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Client questionnaire answers */}
            <div>
              <div style={{ font: 'var(--t-h2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {serviceProfile.questionnaireLabel}
                {detailsDone && <span className="chip chip-success">Done</span>}
              </div>
              {detailsDone ? (
                <div className="context">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {allDetailFieldsForService(project.type, primaryService).map(f => {
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
                onClick={() => selectTab('Money')}
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

              {serviceProfile.features.showPrep && (
                <button
                  type="button"
                  onClick={() => selectTab('Prep')}
                  className="flex w-full items-center gap-2.5 border-0 bg-transparent py-2.5 text-left"
                  style={{ borderTop: '1px solid var(--line-soft)', cursor: 'pointer' }}
                >
                  <span className="marker" style={{ width: 30, height: 30, background: 'var(--gold-soft)', color: '#7a4a1e', fontSize: 12 }}>✓</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {journeySteps.find(s => s.key === 'prep')?.label || 'Prep'}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      {prepDoneCount} of {prepFields.length} fields
                    </div>
                  </div>
                  <span className={prepDoneCount === prepFields.length ? 'chip chip-success' : prepDoneCount > 0 ? 'chip chip-success' : 'chip chip-muted'}>
                    {prepDoneCount === 0 ? 'To do' : prepDoneCount === prepFields.length ? 'Ready' : 'In progress'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => selectTab('Chat')}
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

              {serviceProfile.features.showDelivery && (
                <button
                  type="button"
                  onClick={() => selectTab('Delivery')}
                  className="flex w-full items-center gap-2.5 border-0 bg-transparent py-2.5 text-left"
                  style={{ borderTop: '1px solid var(--line-soft)', cursor: 'pointer' }}
                >
                  <span className="marker" style={{ width: 30, height: 30, background: 'var(--recessed)', color: 'var(--muted)', fontSize: 12 }}>⬇</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {journeySteps.find(s => s.key === 'delivery')?.label || 'Delivery'}
                    </div>
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
                    ? <span className="chip chip-muted">Not yet</span>
                    : deliveryApproved
                      ? <span className="chip chip-success">Done</span>
                      : null}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MONEY */}
      {tab === 'Money' && (
        <div className="ws-stack" style={{ maxWidth: 620 }}>
          {vendorClosed && (
            <div className="banner banner-offline">
              Booking closed — Money is read-only. No new quotes or payment requests.
            </div>
          )}
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
              const methodLocked = moneyLocked || vendorClosed
              return (
                <button
                  key={m.v}
                  type="button"
                  disabled={methodLocked}
                  onClick={() => { if (!methodLocked) setQuote(q => ({ ...q, method: m.v })) }}
                  className={selected ? 'action-outline' : 'panel'}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: 16,
                    marginBottom: 10,
                    boxShadow: selected ? undefined : 'none',
                    cursor: methodLocked ? 'not-allowed' : 'pointer',
                    opacity: methodLocked && !selected ? 0.55 : 1,
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
            <div style={{ font: 'var(--t-h2)', marginBottom: 6 }}>Quote</div>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted)', maxWidth: '48ch' }}>
              {vendorClosed
                ? 'Quote is read-only on a closed booking.'
                : moneyLocked
                  ? 'You can still update the title and what’s included. Amounts stay as paid.'
                  : project.proposal
                    ? 'Edit anything, then send again — your client sees the update on their booking page.'
                    : 'Treat this as a first draft: title, total, what’s included. Edit freely — they only see it when you send.'}
            </p>
            {moneyLocked && !vendorClosed && (
              <div className="banner banner-error" style={{ marginBottom: 12 }}>
                This quote&apos;s amounts are locked because a deposit has been paid.
              </div>
            )}
            <div className="grid gap-3">
              <div>
                <label className="label">Quote title <span style={{ color: 'var(--coral)' }}>*</span></label>
                <input
                  value={quote.title}
                  onChange={e => setQuote(q => ({ ...q, title: e.target.value }))}
                  placeholder="e.g. Full-day package"
                  disabled={vendorClosed}
                />
              </div>
              {quote.method !== 'free' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Total (£) <span style={{ color: 'var(--coral)' }}>*</span></label>
                    <input type="number" min={0} step="0.01" inputMode="decimal" value={quote.price} onChange={e => setQuote(q => ({ ...q, price: e.target.value }))} placeholder="0.00" disabled={moneyLocked || vendorClosed} />
                  </div>
                  <div>
                    <label className="label">Deposit (£)</label>
                    <input type="number" min={0} step="0.01" inputMode="decimal" value={quote.deposit} onChange={e => setQuote(q => ({ ...q, deposit: e.target.value }))} placeholder="0.00" disabled={moneyLocked || vendorClosed} />
                  </div>
                </div>
              )}
              {quote.method === 'free' && (
                <div className="banner banner-success">
                  <Gift size={16} /> Free collaboration — total and deposit are set to £0.
                </div>
              )}
              <textarea
                value={quote.description}
                onChange={e => setQuote(q => ({ ...q, description: e.target.value }))}
                placeholder="What's included"
                rows={3}
                disabled={vendorClosed}
              />
              {quoteError && !vendorClosed && <div className="banner banner-error">{quoteError}</div>}
            </div>
            {!vendorClosed && (
              <>
                <button
                  type="button"
                  className="btn btn-lime"
                  style={{ marginTop: 14 }}
                  disabled={!!busy || !!quoteError}
                  onClick={() => run('quote', sendQuote)}
                >
                  {busy === 'quote' ? <Loader2 size={16} className="animate-spin" /> : <><FileText size={16} className="mr-2" />{project.proposal ? 'Update & resend quote' : 'Send quote to client'}</>}
                </button>
                <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--muted)', maxWidth: '48ch' }}>
                  Your client will see this on their booking page immediately. Nothing is charged from here.
                </p>
              </>
            )}
          </div>

          {project.proposal && quote.method !== 'free' && (
            <>
              <div className="panel" style={{ padding: 14 }}>
                <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 8 }}>Money path</div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>
                  Quote → Plan (auto) → Client accepts → Agreement (auto) → Sign → Pay → Confirm
                </p>
              </div>
              <PaymentScheduleEditor
                projectId={project.id}
                quoteTotal={Number(quote.price || project.proposal.price || 0)}
                savedStages={paymentStages}
                payments={project.payments || []}
                amountLocked={stagesAmountLocked}
                readOnly={vendorClosed}
                contractSigned={
                  !!project.contract?.signedAt ||
                  ['CONTRACT_SIGNED', 'DEPOSIT_PAID', 'FULLY_PAID', 'COMPLETED'].includes(project.status)
                }
                busy={busy}
                run={run}
                onChanged={load}
              />
            </>
          )}

          {project.proposal && (
            <div className="context" style={{ padding: 16 }}>
              <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 12 }}>Confirmation</div>
              {vendorClosed ? (
                <p style={{ fontSize: 13.5, margin: 0, color: 'var(--muted)' }}>
                  Payment actions are locked on a closed booking. History below stays for your records.
                </p>
              ) : method === 'free' ? (
                <div>
                  <p style={{ fontSize: 13.5, margin: '0 0 12px' }}>Free collaboration — no payment required.</p>
                  {project.status === 'CONTRACT_SIGNED' && (
                    <button type="button" className="btn btn-forest" disabled={!!busy} onClick={() => run('free', completeFree)}>
                      <Gift size={16} className="mr-2" />Confirm free collaboration
                    </button>
                  )}
                </div>
              ) : hasPaymentSchedule ? (
                <div>
                  <p style={{ fontSize: 13.5, margin: '0 0 12px', color: 'var(--muted)' }}>
                    Confirm each stage in the payment plan above after the client signs. Classic deposit /
                    balance buttons stay off while a plan is active.
                  </p>
                  {project.status === 'PROPOSAL_ACCEPTED' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-forest"
                        disabled={!!busy}
                        onClick={() => run('contract', sendContract)}
                      >
                        {busy === 'contract' ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          'Send agreement →'
                        )}
                      </button>
                      <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
                        Quote accepted — agreement usually sends automatically. Use this if they still can’t see it.
                      </p>
                    </>
                  )}
                  {project.status === 'CONTRACT_SENT' && (
                    <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>
                      Agreement sent — waiting for {clientName} to sign on their link.
                    </p>
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
                    {pendingDeposit || (!deposit && project.status === 'CONTRACT_SIGNED') ? (
                      <button
                        type="button"
                        className="btn btn-forest btn-block"
                        style={{ marginTop: 5, minHeight: 34 }}
                        disabled={!!busy}
                        onClick={() => run('dep', () => recordPayment('DEPOSIT'))}
                      >
                        Confirm {serviceProfile.depositLabel.toLowerCase()} received
                      </button>
                    ) : pendingFinal ? (
                      <button
                        type="button"
                        className="btn btn-forest btn-block"
                        style={{ marginTop: 5, minHeight: 34 }}
                        disabled={!!busy}
                        onClick={() => run('final', () => recordPayment('FINAL'))}
                      >
                        Confirm balance received
                      </button>
                    ) : deposit && balanceOutstanding && !balanceRequested ? (
                      <button
                        type="button"
                        className="btn btn-forest btn-block"
                        style={{ marginTop: 5, minHeight: 34 }}
                        disabled={!!busy}
                        onClick={() => run('reqbal', requestBalance)}
                      >
                        Request balance from client
                      </button>
                    ) : deposit && balanceOutstanding && balanceRequested ? (
                      <div style={{ marginTop: 5, fontSize: 13, color: 'var(--muted)' }}>
                        Waiting for client to report the balance
                      </div>
                    ) : deposit ? (
                      <div style={{ marginTop: 5, fontSize: 13.5, fontWeight: 700, color: 'var(--success)' }}>
                        ✓ {serviceProfile.depositLabel} received
                      </div>
                    ) : (
                      <div style={{ marginTop: 5, fontSize: 13, color: 'var(--muted)' }}>After the quote is accepted</div>
                    )}
                  </div>
                </div>
              )}
              {!vendorClosed && !hasPaymentSchedule && method !== 'free' && (
                <>
                  <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
                    Only confirm when the money is in your account. This does not move money — it updates the booking.
                    The balance form stays closed for your client until you request it.
                  </p>
                  {pendingPayment && (
                    <div className="banner banner-offline" style={{ marginTop: 12 }}>
                      Client reported{' '}
                      {pendingPayment.type === 'FINAL' || pendingPayment.type === 'INSTALMENT'
                        ? 'balance'
                        : serviceProfile.depositLabel.toLowerCase()}{' '}
                      by {declaredPaymentMethodLabel(pendingPayment.method)}. Confirm only once it has cleared —
                      this does not move money.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="panel" style={{ padding: 18 }}>
            <div className="kicker" style={{ color: 'var(--faint)', marginBottom: 10 }}>Payment history</div>
            {(project.payments || []).length === 0 ? (
              <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>No payments yet — nothing to worry about.</p>
            ) : (
              <ul className="space-y-2" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {(project.payments || []).map((p: any) => (
                  <li key={p.id} className="num" style={{ fontSize: 13.5, color: 'var(--ink)' }}>
                    {p.type} · £{Number(p.amount).toFixed(2)} ·{' '}
                    {p.status === 'PENDING'
                      ? `reported (${declaredPaymentMethodLabel(p.method)}) — waiting for you`
                      : p.status === 'COMPLETED'
                        ? 'confirmed'
                        : p.status}
                    {p.status !== 'PENDING' && p.method ? ` · ${declaredPaymentMethodLabel(p.method)}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* PREPARATION — fields driven by Service Profile */}
      {tab === 'Prep' && serviceProfile.features.showPrep && (
        <div className="panel" style={{ padding: 20, maxWidth: 620 }}>
          <div style={{ font: 'var(--t-h2)', marginBottom: 6 }}>
            {journeySteps.find(s => s.key === 'prep')?.label || 'Prep'}
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--muted)', maxWidth: '48ch' }}>
            {vendorClosed
              ? 'Prep is read-only on a closed booking. Venue notes below stay editable — your memory, not a client action.'
              : 'Your notes for the day — fill what helps you feel ready. Nothing here is shown to the client until you share a delivery link.'}
          </p>
          {vendorClosed && (
            <div className="banner banner-offline" style={{ marginBottom: 14 }}>
              Booking closed — prep fields locked. Venue notes stay open.
            </div>
          )}
          <div className="space-y-4">
            {prepFields.includes('eventDate') && (
              <div>
                <label className="label">{prepFieldLabels('eventDate', primaryService).label}</label>
                <input
                  ref={prepDateRef}
                  type="datetime-local"
                  value={prep.eventDate}
                  onChange={e => setPrep(p => ({ ...p, eventDate: e.target.value }))}
                  disabled={vendorClosed}
                />
              </div>
            )}
            {prepFields.includes('location') && (
              <div>
                <label className="label">{prepFieldLabels('location', primaryService).label}</label>
                <input
                  value={prep.location}
                  onChange={e => setPrep(p => ({ ...p, location: e.target.value }))}
                  onBlur={() => setPrepLookupLocation(prep.location.trim())}
                  placeholder={prepFieldLabels('location', primaryService).placeholder}
                  disabled={vendorClosed}
                />
                {!vendorClosed && <VenueMemoryPanel location={prepLookupLocation} city="" variant="panel" />}
              </div>
            )}
            {(prepFields.includes('moodboard') || prepFields.includes('music')) && (
              <div>
                <label className="label">
                  {prepFieldLabels(prepFields.includes('music') ? 'music' : 'moodboard', primaryService).label}
                </label>
                <textarea
                  rows={3}
                  placeholder={prepFieldLabels(prepFields.includes('music') ? 'music' : 'moodboard', primaryService).placeholder}
                  value={prep.moodboard}
                  onChange={e => setPrep(p => ({ ...p, moodboard: e.target.value }))}
                  disabled={vendorClosed}
                />
                {!vendorClosed && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' }}>
                    Paste a https:// link, or write notes — both save.
                  </p>
                )}
              </div>
            )}
            {prepFields.includes('equipment') && (
              <div>
                <label className="label">{prepFieldLabels('equipment', primaryService).label}</label>
                <textarea
                  value={prep.notes}
                  onChange={e => setPrep(p => ({ ...p, notes: e.target.value }))}
                  rows={4}
                  placeholder={prepFieldLabels('equipment', primaryService).placeholder}
                  disabled={vendorClosed}
                />
              </div>
            )}
            {prepFields.includes('notes') && !prepFields.includes('equipment') && (
              <div>
                <label className="label">{prepFieldLabels('notes', primaryService).label}</label>
                <textarea
                  value={prep.notes}
                  onChange={e => setPrep(p => ({ ...p, notes: e.target.value }))}
                  rows={4}
                  placeholder={prepFieldLabels('notes', primaryService).placeholder}
                  disabled={vendorClosed}
                />
              </div>
            )}
            {!vendorClosed && (
              <>
                <button type="button" className="btn btn-lime" disabled={busy === 'prep'} onClick={() => run('prep', savePrep)}>
                  {busy === 'prep' ? <Loader2 size={16} className="animate-spin" /> : prepSaveLabel(primaryService)}
                </button>
                <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
                  Saved for you in this booking — you’re getting ready, not sending to the client.
                </p>
              </>
            )}
            {/* Makeup / DJ have no Delivery tab — complete from Prep only when money is settled. */}
            {!vendorClosed &&
              !serviceProfile.features.showDelivery &&
              canCompleteForMoney({
                status: project.status,
                stages: paymentStages.map((s: { id: string; sortOrder: number; requestedAt?: string | null }) => ({
                  id: s.id,
                  sortOrder: s.sortOrder,
                  requestedAt: s.requestedAt,
                })),
                payments: project.payments || [],
                quoteTotal: Number(project.proposal?.price ?? 0),
                depositAmount: Number(
                  project.proposal?.depositAmount ?? project.proposal?.deposit ?? 0,
                ),
              }).ok && (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 10px' }}>
                  When the {serviceProfile.key === 'DJ' ? 'performance' : 'appointment'} is done, mark it complete.
                </p>
                <button
                  type="button"
                  className="btn btn-forest"
                  disabled={!!busy}
                  onClick={() => run('complete', completeDelivery)}
                >
                  {serviceProfile.key === 'DJ'
                    ? 'Mark performance complete →'
                    : serviceProfile.key === 'MAKEUP_ARTIST'
                      ? 'Mark appointment complete →'
                      : 'Mark service complete →'}
                </button>
              </div>
            )}
            {!vendorClosed &&
              !serviceProfile.features.showDelivery &&
              project.status === 'DEPOSIT_PAID' &&
              paymentStages.some((s: { sortOrder: number; id: string }) => s.sortOrder > 0) &&
              !canCompleteForMoney({
                status: project.status,
                stages: paymentStages,
                payments: project.payments || [],
                quoteTotal: Number(project.proposal?.price ?? 0),
                depositAmount: Number(
                  project.proposal?.depositAmount ?? project.proposal?.deposit ?? 0,
                ),
              }).ok && (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 10px' }}>
                  Deposit is in — request and confirm the balance on Money before you mark this complete.
                </p>
                <button
                  type="button"
                  className="btn btn-forest"
                  onClick={() => setTab('Money')}
                >
                  Open Money →
                </button>
              </div>
            )}
            {/* Learning: venue notes stay editable after close (and archive). */}
            {!serviceProfile.features.showDelivery && project.status === 'COMPLETED' && (
              <VenueNoteForm
                projectId={project.id}
                location={project.location || prep.location}
              />
            )}
          </div>
        </div>
      )}

      {/* DELIVERY — hidden for services without gallery/recording (Makeup, DJ) */}
      {tab === 'Delivery' && serviceProfile.features.showDelivery && (
        <div className="ws-stack" style={{ maxWidth: 620 }}>
          {vendorClosed && (
            <div className="banner banner-offline">
              Booking closed — Delivery is read-only. Venue notes stay editable.
            </div>
          )}
          {!vendorClosed && !progress.service && !deliverablesSent ? (
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
              <div style={{ font: 'var(--t-h2)' }}>{deliveryLockedCopy(primaryService)}</div>
              <p style={{ fontSize: 13, color: 'var(--on-dark-mut)', maxWidth: '40ch', margin: '5px auto 16px' }}>
                When you are ready, mark the service complete — then add the link for {clientName}.
              </p>
              <div style={{ marginTop: 8 }}>
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
              {!vendorClosed && (project.status === 'COMPLETED' || progress.service) && (
                <div className="banner banner-success">
                  Service marked complete — add the {deliveryOpenCopy(primaryService).title.toLowerCase()} link below.
                </div>
              )}
              {!vendorClosed && !(project.status === 'COMPLETED' || progress.service) && (
                <div>
                  <button type="button" className="btn btn-lime" disabled={!!busy} onClick={() => run('complete', completeDelivery)}>
                    Mark service complete →
                  </button>
                  <p style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>Do this once the service has taken place.</p>
                </div>
              )}

              <div className="panel" style={{ padding: 18 }}>
                <div style={{ font: 'var(--t-h2)', marginBottom: 6 }}>{deliveryOpenCopy(primaryService).title}</div>
                {!vendorClosed && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
                    Paste a download link. {clientName} sees it on their page and can approve.
                  </p>
                )}
                {!vendorClosed && (
                  <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <input value={gallery.name} onChange={e => setGallery(g => ({ ...g, name: e.target.value }))} placeholder="Label" />
                    <input value={gallery.url} onChange={e => setGallery(g => ({ ...g, url: e.target.value }))} placeholder="https://..." inputMode="url" />
                    <button
                      type="button"
                      className="btn btn-forest shrink-0"
                      disabled={busy === 'gallery' || !gallery.url.trim()}
                      onClick={() => run('gallery', addGallery)}
                    >
                      {busy === 'gallery' ? <Loader2 size={16} className="animate-spin" /> : <><LinkIcon size={16} className="mr-2" />{deliveryOpenCopy(primaryService).addLabel}</>}
                    </button>
                  </div>
                )}
                {(project.files || []).filter((f: any) => f.type === 'gallery' || f.type === 'recording').length > 0 ? (
                  <ul className="mt-4 space-y-2" style={{ margin: vendorClosed ? 0 : '16px 0 0', padding: 0, listStyle: 'none' }}>
                    {(project.files || []).filter((f: any) => f.type === 'gallery' || f.type === 'recording').map((f: any) => (
                      <li key={f.id} className="flex items-center gap-2 text-sm">
                        <LinkIcon size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                        <a href={f.url} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 2 }} className="truncate">
                          {f.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : vendorClosed ? (
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>No files were shared on this booking.</p>
                ) : null}
              </div>

              <div className="context" style={{ padding: 16 }}>
                {deliveryApproved ? (
                  <div className="banner banner-success" style={{ margin: 0 }}>
                    {project.review
                      ? 'Client approved and left a review — this booking is closed on their side.'
                      : 'Client approved delivery — they can leave a quick review next.'}
                  </div>
                ) : deliverablesSent ? (
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                    Your link is live. They can open and approve it on their booking page.
                  </p>
                ) : !vendorClosed ? (
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                    Paste the download link when you’re ready — they only see it after you add it.
                  </p>
                ) : null}
                {archived ? (
                  <button
                    type="button"
                    className="btn btn-forest"
                    style={{ marginTop: 12 }}
                    disabled={!!busy}
                    onClick={() => run('restore', restoreBooking)}
                  >
                    Restore booking
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ marginTop: 12 }}
                    disabled={!!busy}
                    onClick={() => setConfirmKind('archive')}
                  >
                    Archive booking
                  </button>
                )}
              </div>

              {/* Learning: venue notes stay editable after close (and archive). */}
              {project.status === 'COMPLETED' && (
                <VenueNoteForm
                  projectId={project.id}
                  location={project.location || prep.location}
                />
              )}
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
                  <p style={{ margin: '12px 0 0', fontWeight: 600, color: 'var(--ink)' }}>Quiet for now</p>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)', maxWidth: '36ch', marginInline: 'auto' }}>
                    Send a short note when you need to — it appears on their secure booking page too.
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
              {peerTyping ? <TypingPreview name={peerTyping.name || clientLabel} /> : null}
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

      <RenameBookingDialog
        open={confirmKind === 'rename'}
        initialTitle={project.title}
        busy={busy === 'edit'}
        onClose={() => !busy && setConfirmKind(null)}
        onSave={title =>
          run('edit', async () => {
            await patchProject({ title })
            toast.success('Booking name updated')
            setConfirmKind(null)
          })
        }
      />

      <ConfirmDialog
        open={confirmKind === 'archive'}
        title="Archive this booking?"
        onClose={() => !busy && setConfirmKind(null)}
        busy={busy === 'archive'}
        primaryLabel="Archive"
        onPrimary={() =>
          run('archive', async () => {
            await archiveBooking()
            setConfirmKind(null)
          })
        }
      >
        <p style={{ margin: 0 }}>
          <strong>{project.title}</strong> moves to your Archived shelf. You can restore it anytime —
          nothing is deleted.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmKind === 'cancel'}
        title="Cancel this booking?"
        onClose={() => !busy && setConfirmKind(null)}
        busy={busy === 'cancel'}
        primaryLabel="Cancel booking"
        primaryVariant="danger"
        onPrimary={() =>
          run('cancel', async () => {
            await patchProject({ cancel: true })
            toast.success('Booking cancelled')
            setConfirmKind(null)
          })
        }
      >
        <p style={{ margin: 0 }}>
          <strong>{project.title}</strong> will leave your active work. Prefer Archive if you might
          need it again.
        </p>
      </ConfirmDialog>

      <ProjectDeleteDialog
        open={confirmKind === 'delete'}
        busy={busy === 'delete'}
        onClose={() => !busy && setConfirmKind(null)}
        onArchive={
          archived
            ? undefined
            : () =>
                run('archive', async () => {
                  await archiveBooking()
                  setConfirmKind(null)
                })
        }
        onDelete={() =>
          run('delete', async () => {
            const res = await fetch(`/api/vendor/projects/${params.slug}`, { method: 'DELETE' })
            const parsed = await parseJsonResponse<{ error?: string }>(res)
            if (!parsed.ok) throw new Error(parsed.data.error || 'Delete failed')
            toast.success('Test project deleted')
            window.location.href = '/vendor/projects'
          })
        }
        summary={{
          title: project.title,
          clientName: project.client?.name || project.client?.email,
          paymentCount: (project.payments || []).length,
          fileCount: Array.isArray(project.files) ? project.files.length : null,
          canArchive: !archived,
          simple: archived || vendorClosed || project.status === 'COMPLETED',
        }}
      />
    </WorkspaceLayout>
  )
}

export default function VendorProjectWorkspacePage({ params }: { params: { slug: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-[color:var(--muted)]">
          Loading booking…
        </div>
      }
    >
      <VendorProjectWorkspace params={params} />
    </Suspense>
  )
}
