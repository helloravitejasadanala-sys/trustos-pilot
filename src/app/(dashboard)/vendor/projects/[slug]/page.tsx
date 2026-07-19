'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  Loader2, Copy, Check, Home, Calendar, User, Clock,
  FileText, CreditCard, CheckCircle, Circle, MessageCircle,
  Send, CheckSquare, Star, AlertTriangle, Package, ChevronLeft
} from 'lucide-react'
import { getNextAction, nextDeadline } from '@/lib/journey'
import { StatusChip } from '@/components/ui'
import EquipmentChecklist from '@/components/EquipmentChecklist'
import PostEventLearning from '@/components/PostEventLearning'

export default function VendorProjectWorkspace({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    const res = await fetch(`/api/vendor/projects/${params.slug}/detail`)
    if (!res.ok) { setState('error'); return }
    const json = await res.json()
    setProject(json.project)
    setState('ready')
  }

  useEffect(() => { load() }, [params.slug])

  // ─── ACTION HANDLERS ───
  async function sendQuestionnaire() {
    setBusy('questionnaire')
    try {
      const res = await fetch(`/api/vendor/projects/${project.id}/questionnaire`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Questionnaire sent')
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setBusy(null) }
  }

  async function createProposal() {
    router.push(`/vendor/projects/${params.slug}/proposal`)
  }

  async function sendContract() {
    setBusy('contract')
    try {
      const res = await fetch(`/api/vendor/projects/${project.id}/contract`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Contract sent')
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setBusy(null) }
  }

  async function recordPayment(type: 'DEPOSIT' | 'FINAL') {
    setBusy(`payment-${type}`)
    try {
      const res = await fetch(`/api/vendor/projects/${project.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, method: 'manual' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${type === 'DEPOSIT' ? 'Deposit' : 'Final payment'} recorded`)
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setBusy(null) }
  }

  async function completeDelivery() {
    setBusy('complete')
    try {
      const res = await fetch(`/api/vendor/projects/${project.id}/complete`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Delivery marked complete')
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setBusy(null) }
  }

  async function requestReview() {
    setBusy('review')
    try {
      const res = await fetch(`/api/vendor/projects/${project.id}/review-request`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Review requested')
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setBusy(null) }
  }

  async function copyLink() {
    if (!project?.invitation?.url) return
    try {
      await navigator.clipboard.writeText(project.invitation.url)
      setCopied(true)
      toast.success('Secure link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch { toast.error('Could not copy') }
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Loader2 className="animate-spin text-ink-400" size={24} />
      </div>
    )
  }

  if (state === 'error' || !project) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink-600">This project could not be found.</p>
        <button onClick={() => router.push('/vendor')} className="text-sm text-forest-700 font-medium hover:underline">
          ← Back to dashboard
        </button>
      </div>
    )
  }

  const na = getNextAction(project.status)
  const deadline = nextDeadline(project.milestones || [])
  const inv = project.invitation
  const deposit = (project.payments || []).find((p: any) => p.type === 'DEPOSIT' && p.status === 'COMPLETED')
  const finalPayment = (project.payments || []).find((p: any) => p.type === 'FINAL' && p.status === 'COMPLETED')

  const getPrimaryAction = () => {
    switch (project.status) {
      case 'LEAD': return { label: 'Send questionnaire', handler: sendQuestionnaire, icon: Send }
      case 'QUESTIONNAIRE_COMPLETED': return { label: 'Create proposal', handler: createProposal, icon: FileText }
      case 'PROPOSAL_ACCEPTED': return { label: 'Send contract', handler: sendContract, icon: FileText }
      case 'CONTRACT_SIGNED': return { label: 'Record deposit', handler: () => recordPayment('DEPOSIT'), icon: CreditCard }
      case 'DEPOSIT_PAID': return { label: 'Mark delivery complete', handler: completeDelivery, icon: CheckSquare }
      case 'FULLY_PAID': return { label: 'Request review', handler: requestReview, icon: Star }
      default: return null
    }
  }

  const primaryAction = getPrimaryAction()

  return (
    <div className="relative min-h-screen bg-paper text-ink-900">
      {/* Noise texture */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "256px 256px" }}
      />

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[5%] h-[50vh] w-[50vh] rounded-full opacity-[0.06] blur-[100px]" style={{ background: "radial-gradient(circle, #d4b8a3 0%, transparent 70%)" }} />
        <div className="absolute -right-[5%] top-[20%] h-[40vh] w-[40vh] rounded-full opacity-[0.04] blur-[90px]" style={{ background: "radial-gradient(circle, #b9d3c4 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-5 py-6 pb-24">
        {/* ─── BREADCRUMB ─── */}
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => router.push('/vendor')} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-forest-700 transition-colors">
            <Home size={14} /> Dashboard
          </button>
          <span className="text-ink-300">/</span>
          <span className="text-sm text-ink-400 truncate max-w-[200px]">{project.title}</span>
        </div>

        {/* ─── PROJECT HEADER ─── */}
        <h1 className="font-display text-2xl font-semibold text-ink-950 tracking-tight">{project.title}</h1>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2 text-sm text-ink-600">
          <span className="flex items-center gap-1.5"><User size={14} className="text-ink-400" />{project.client?.name || inv?.email || 'No client yet'}</span>
          {project.eventDate && <span className="flex items-center gap-1.5"><Calendar size={14} className="text-ink-400" />{new Date(project.eventDate).toLocaleDateString('en-GB')}</span>}
          <StatusChip status={project.status} />
        </div>

        {/* ─── TODAY'S ACTION CARD (Redesigned) ─── */}
        <div className="mt-6 relative overflow-hidden rounded-2xl border border-forest-200/40 bg-forest-950 text-paper-50 shadow-elevated">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-400 opacity-60"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-300"></span>
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-forest-300">Today's Action</p>
            </div>
            <p className="font-display text-xl leading-snug">{na.nextAction}</p>
            <div className="flex gap-4 mt-2 text-xs text-forest-300/70">
              <span>Responsible: <strong className="text-forest-200">{na.responsible}</strong></span>
              {deadline && <span className="flex items-center gap-1"><Clock size={12} />Due {deadline.toLocaleDateString('en-GB')}</span>}
            </div>
            {primaryAction && (
              <button
                onClick={primaryAction.handler}
                disabled={!!busy}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-paper-50 text-forest-950 px-5 py-2.5 text-sm font-semibold shadow-soft transition-all hover:bg-white hover:shadow-elevated disabled:opacity-40"
              >
                {busy === primaryAction.label.toLowerCase().replace(/\s+/g, '-') ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <primaryAction.icon size={15} />
                )}
                {primaryAction.label}
              </button>
            )}
          </div>
          <div className="absolute bottom-0 right-0 h-20 w-20 bg-forest-800/20" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
        </div>

        {/* ─── CLIENT LINK ─── */}
        {inv && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-ink-200/40 bg-white/70 p-4 backdrop-blur-sm">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-400">Client Link</p>
              <p className="text-sm text-ink-600 mt-1">{inv.openedAt ? `Opened ${new Date(inv.openedAt).toLocaleDateString('en-GB')}` : 'Not opened yet'}</p>
            </div>
            <button onClick={copyLink} className="text-sm font-medium text-forest-700 flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-forest-50 transition shrink-0">
              {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        )}

        {/* ─── JOURNEY TIMELINE ─── */}
        <div className="mt-6 rounded-2xl border border-ink-200/40 bg-white/70 p-5 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-ink-800 mb-4">Project Journey</h3>
          <div className="space-y-3">
            <TimelineStep done={!!project.questionnaire?.completedAt} active={project.status === 'QUESTIONNAIRE_SENT'} title="Questionnaire" description={project.questionnaire?.completedAt ? 'Completed' : project.status === 'QUESTIONNAIRE_SENT' ? 'Waiting for client' : 'Not sent'} />
            <TimelineStep done={project.proposal?.acceptedAt} active={project.status === 'QUESTIONNAIRE_COMPLETED'} title="Proposal" description={project.proposal?.acceptedAt ? `Accepted · £${Number(project.proposal.price).toFixed(2)}` : project.proposal ? 'Sent, awaiting acceptance' : 'Not created'} />
            <TimelineStep done={!!project.contract?.signedAt} active={project.status === 'PROPOSAL_ACCEPTED'} title="Contract" description={project.contract?.signedAt ? `Signed by ${project.contract.signedBy}` : project.contract ? 'Sent, awaiting signature' : 'Not sent'} />
            <TimelineStep done={!!deposit} active={project.status === 'CONTRACT_SIGNED'} title="Deposit" description={deposit ? `£${Number(deposit.amount).toFixed(2)} received` : 'Awaiting payment'} />
            <TimelineStep done={!!finalPayment} active={project.status === 'DEPOSIT_PAID'} title="Final Payment" description={finalPayment ? `£${Number(finalPayment.amount).toFixed(2)} received` : project.status === 'FULLY_PAID' ? 'Paid' : 'Awaiting final payment'} />
            <TimelineStep done={project.status === 'COMPLETED'} active={project.status === 'FULLY_PAID'} title="Delivery & Review" description={project.status === 'COMPLETED' ? 'Completed' : project.review ? 'Review received' : 'Pending'} />
          </div>
        </div>

        {/* ─── MILESTONES ─── */}
        <Section title="Milestones" icon={<CheckCircle size={15} />}>
          {project.milestones?.length ? (
            <div className="space-y-2">
              {project.milestones.map((m: any) => (
                <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl border border-ink-200/30 bg-white/50">
                  {m.completedAt ? (
                    <CheckCircle size={18} className="text-forest-500 mt-0.5 shrink-0" />
                  ) : (
                    <Circle size={18} className="text-ink-300 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={m.completedAt ? 'text-ink-500 line-through' : 'text-ink-800 font-medium'}>{m.title}</p>
                    {m.dueDate && !m.completedAt && <p className="text-xs text-ink-400 mt-0.5">Due {new Date(m.dueDate).toLocaleDateString('en-GB')}</p>}
                    {m.description && <p className="text-xs text-ink-500 mt-1">{m.description}</p>}
                  </div>
                  {!m.completedAt && project.status === 'DEPOSIT_PAID' && (
                    <button
                      onClick={async () => {
                        setBusy(`milestone-${m.id}`)
                        try {
                          const res = await fetch(`/api/vendor/projects/${project.id}/milestones/${m.id}/complete`, { method: 'POST' })
                          if (!res.ok) throw new Error('Failed')
                          toast.success('Milestone completed')
                          load()
                        } catch { toast.error('Failed to complete') }
                        finally { setBusy(null) }
                      }}
                      disabled={!!busy}
                      className="text-xs font-medium text-forest-700 hover:text-forest-900 px-3 py-1.5 rounded-lg hover:bg-forest-50 transition"
                    >
                      {busy === `milestone-${m.id}` ? <Loader2 size={12} className="animate-spin" /> : 'Complete'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : <Muted>No milestones.</Muted>}
        </Section>

        {/* ─── MESSAGES ─── */}
        <Section title="Messages" icon={<MessageCircle size={15} />}>
          {project.messages?.length ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {project.messages.map((msg: any) => (
                <div key={msg.id} className={`p-3 rounded-xl text-sm ${msg.sender?.name === project.client?.name ? 'bg-forest-50 border border-forest-100' : 'bg-white/50 border border-ink-100'}`}>
                  <p className="text-xs text-ink-400 mb-1">{msg.sender?.name || 'System'} · {new Date(msg.createdAt).toLocaleDateString('en-GB')}</p>
                  <p className="text-ink-700">{msg.content}</p>
                </div>
              ))}
            </div>
          ) : <Muted>No messages yet.</Muted>}
        </Section>

        {/* ─── EQUIPMENT CHECKLIST ─── */}
        <EquipmentChecklist projectId={project.id} projectType={project.type} />

        {/* ─── POST-EVENT LEARNING ─── */}
        {project.status === 'COMPLETED' && (
          <PostEventLearning projectId={project.id} onSubmit={load} />
        )}

        {/* ─── QUICK ACTIONS ─── */}
        <div className="mt-6 rounded-2xl border border-ink-200/40 bg-white/70 p-5 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-ink-800 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            {project.status === 'LEAD' && <ActionButton onClick={sendQuestionnaire} busy={busy === 'questionnaire'} icon={Send} label="Send Questionnaire" />}
            {project.status === 'QUESTIONNAIRE_COMPLETED' && <ActionButton onClick={createProposal} busy={busy === 'proposal'} icon={FileText} label="Create Proposal" />}
            {project.status === 'PROPOSAL_ACCEPTED' && <ActionButton onClick={sendContract} busy={busy === 'contract'} icon={FileText} label="Send Contract" />}
            {project.status === 'CONTRACT_SIGNED' && !deposit && <ActionButton onClick={() => recordPayment('DEPOSIT')} busy={busy === 'payment-DEPOSIT'} icon={CreditCard} label="Record Deposit" />}
            {project.status === 'DEPOSIT_PAID' && <ActionButton onClick={completeDelivery} busy={busy === 'complete'} icon={CheckSquare} label="Complete Delivery" />}
            {project.status === 'FULLY_PAID' && <ActionButton onClick={requestReview} busy={busy === 'review'} icon={Star} label="Request Review" />}
            {project.status === 'COMPLETED' && !project.review && <ActionButton onClick={requestReview} busy={busy === 'review'} icon={Star} label="Follow up for Review" />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SUB-COMPONENTS ───

function TimelineStep({ done, active, title, description }: { done: boolean; active: boolean; title: string; description: string }) {
  return (
    <div className={`flex items-start gap-3 ${active ? 'opacity-100' : 'opacity-60'}`}>
      <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-forest-500 text-white' : active ? 'bg-forest-200 text-forest-700' : 'bg-ink-200 text-ink-400'}`}>
        {done ? <Check size={12} /> : <Circle size={12} />}
      </div>
      <div>
        <p className={`text-sm font-medium ${done ? 'text-forest-700 line-through' : active ? 'text-forest-800' : 'text-ink-600'}`}>{title}</p>
        <p className="text-xs text-ink-400">{description}</p>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-ink-200/40 bg-white/70 p-5 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-ink-800 mb-3 flex items-center gap-2">{icon}{title}</h3>
      {children}
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-400 italic">{children}</p>
}

function ActionButton({ onClick, busy, icon: Icon, label }: { onClick: () => void; busy: boolean; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200/60 bg-white/80 px-4 py-2 text-xs font-semibold text-ink-700 backdrop-blur-sm transition-all hover:border-forest-300 hover:bg-forest-50/50 hover:text-forest-800 disabled:opacity-40"
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      {label}
    </button>
  )
}
