'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  Loader2, Copy, Check, ChevronLeft, Calendar, User, Clock,
  FileText, CreditCard, CheckCircle, Circle, MessageCircle, Paperclip,
} from 'lucide-react'
import { getNextAction, nextDeadline } from '@/lib/journey'
import { StatusChip } from '@/components/ui'

/**
 * STAGE 3 — the vendor project workspace. This is the page audit issue
 * C7 was about: every project row used to link here and 404. It now
 * shows the full project: client, status, next action, who acts,
 * deadline, questionnaire, proposal, contract, payment, milestones,
 * messages, files, approvals, and activity — all from the database.
 */
export default function VendorProjectWorkspace({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [copied, setCopied] = useState(false)

  async function load() {
    const res = await fetch(`/api/vendor/projects/${params.slug}/detail`)
    if (!res.ok) { setState('error'); return }
    const json = await res.json()
    setProject(json.project)
    setState('ready')
  }

  useEffect(() => { load() }, [params.slug])

  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-ink-400" /></div>
  }
  if (state === 'error' || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink-600">This project could not be found.</p>
        <button onClick={() => router.push('/vendor')} className="text-sm text-ink-900 underline">Back to dashboard</button>
      </div>
    )
  }

  const na = getNextAction(project.status)
  const deadline = nextDeadline(project.milestones || [])
  const inv = project.invitation
  const deposit = (project.payments || []).find((p: any) => p.type === 'DEPOSIT' && p.status === 'COMPLETED')

  async function copyLink() {
    if (!inv?.url) return
    try { await navigator.clipboard.writeText(inv.url); setCopied(true); toast.success('Secure link copied'); setTimeout(() => setCopied(false), 2000) }
    catch { toast.error('Could not copy') }
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-3xl mx-auto px-5 py-8">
        <button onClick={() => router.push('/vendor')} className="text-sm text-ink-500 flex items-center gap-1 mb-4">
          <ChevronLeft size={15} /> Dashboard
        </button>

        {/* Header: client + status */}
        <h1 className="text-2xl font-medium text-ink-900">{project.title}</h1>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-ink-600">
          <span className="flex items-center gap-1.5"><User size={14} />{project.client?.name || inv?.email || 'No client yet'}</span>
          {project.eventDate && <span className="flex items-center gap-1.5"><Calendar size={14} />{new Date(project.eventDate).toLocaleDateString('en-GB')}</span>}
          <StatusChip status={project.status} />
        </div>

        {/* Next action band */}
        <div className="mt-5 border border-ink-100 rounded-lg bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-ink-400">Next action</p>
          <p className="text-ink-900 mt-1">{na.nextAction}</p>
          <div className="flex gap-5 mt-2 text-xs text-ink-500">
            <span>Responsible: <strong className="text-ink-700">{na.responsible}</strong></span>
            {deadline && <span className="flex items-center gap-1"><Clock size={12} />Due {deadline.toLocaleDateString('en-GB')}</span>}
          </div>
        </div>

        {/* Secure link */}
        {inv && (
          <div className="mt-4 flex items-center justify-between gap-3 border border-ink-100 rounded-lg bg-white p-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-ink-400">Client link</p>
              <p className="text-sm text-ink-600 mt-1">{inv.openedAt ? `Opened ${new Date(inv.openedAt).toLocaleDateString('en-GB')}` : 'Not opened yet'}</p>
            </div>
            <button onClick={copyLink} className="text-sm font-medium text-ink-700 flex items-center gap-1.5 py-2 px-3 rounded hover:bg-ink-50 shrink-0">
              {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        )}

        <Section title="Questionnaire" icon={<FileText size={15} />}>
          {project.questionnaire?.completedAt
            ? <KeyVals data={project.questionnaire.answers} fallback="Completed" />
            : <Muted>Not completed yet.</Muted>}
        </Section>

        <Section title="Proposal" icon={<FileText size={15} />}>
          {project.proposal ? (
            <div>
              <p className="font-medium text-ink-900">{project.proposal.title}</p>
              <p className="text-lg font-medium text-ink-900 mt-1">£{Number(project.proposal.price).toFixed(2)}</p>
              <p className="text-xs text-ink-500 mt-1">{project.proposal.acceptedAt ? `Accepted ${new Date(project.proposal.acceptedAt).toLocaleDateString('en-GB')}` : 'Awaiting client acceptance'}</p>
            </div>
          ) : <Muted>No proposal yet.</Muted>}
        </Section>

        <Section title="Contract" icon={<FileText size={15} />}>
          {project.contract ? (
            project.contract.signedAt ? (
              <div className="text-sm text-ink-700">
                <p>Signed by <strong>{project.contract.signedBy}</strong> on {new Date(project.contract.signedAt).toLocaleDateString('en-GB')}.</p>
                {project.contract.contentHash && <p className="text-xs text-ink-400 mt-1 break-all">Evidence hash: {project.contract.contentHash.slice(0, 24)}…</p>}
              </div>
            ) : <Muted>Sent, awaiting signature.</Muted>
          ) : <Muted>No contract yet.</Muted>}
        </Section>

        <Section title="Payment" icon={<CreditCard size={15} />}>
          {deposit
            ? <p className="text-sm text-ink-700">Deposit £{Number(deposit.amount).toFixed(2)} received{deposit.method === 'manual' ? ' (recorded by vendor, not independently verified)' : ''}.</p>
            : <Muted>No payment received yet.</Muted>}
        </Section>

        <Section title="Milestones" icon={<CheckCircle size={15} />}>
          {project.milestones?.length ? (
            <ol className="space-y-2">
              {project.milestones.map((m: any) => (
                <li key={m.id} className="flex items-start gap-2 text-sm">
                  {m.completedAt ? <CheckCircle size={16} className="text-sage-600 mt-0.5 shrink-0" /> : <Circle size={16} className="text-ink-300 mt-0.5 shrink-0" />}
                  <div>
                    <span className={m.completedAt ? 'text-ink-500' : 'text-ink-900'}>{m.title}</span>
                    {m.dueDate && !m.completedAt && <span className="text-xs text-ink-400 ml-2">Due {new Date(m.dueDate).toLocaleDateString('en-GB')}</span>}
                  </div>
                </li>
              ))}
            </ol>
          ) : <Muted>No milestones.</Muted>}
        </Section>

        <Section title="Approvals" icon={<Check size={15} />}>
          {project.approvals?.length
            ? project.approvals.map((a: any) => <p key={a.id} className="text-sm text-ink-700">Approved by {a.approvedBy} — {new Date(a.createdAt).toLocaleDateString('en-GB')}</p>)
            : <Muted>No approvals yet.</Muted>}
          {project.revisionRequests?.length ? (
            <div className="mt-2">
              {project.revisionRequests.map((r: any) => <p key={r.id} className="text-sm text-amber-700">Change requested: {r.detail}</p>)}
            </div>
          ) : null}
        </Section>

        <Section title="Messages" icon={<MessageCircle size={15} />}>
          {project.messages?.length
            ? project.messages.map((m: any) => <p key={m.id} className="text-sm text-ink-700"><strong>{m.sender?.name}:</strong> {m.content}</p>)
            : <Muted>No messages.</Muted>}
        </Section>

        <Section title="Files" icon={<Paperclip size={15} />}>
          {project.files?.length
            ? project.files.map((f: any) => <a key={f.id} href={f.url} className="text-sm text-ink-700 underline block">{f.name}</a>)
            : <Muted>No files.</Muted>}
        </Section>

        <Section title="Activity" icon={<Clock size={15} />}>
          {project.activities?.length ? (
            <ul className="space-y-1">
              {project.activities.map((a: any) => (
                <li key={a.id} className="text-xs text-ink-500">
                  {new Date(a.createdAt).toLocaleString('en-GB')} — {a.event.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          ) : <Muted>No activity yet.</Muted>}
        </Section>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-4 border border-ink-100 rounded-lg bg-white p-4">
      <h2 className="text-sm font-medium text-ink-900 flex items-center gap-2 mb-2">{icon}{title}</h2>
      {children}
    </section>
  )
}
function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-400">{children}</p>
}
function KeyVals({ data, fallback }: { data: any; fallback: string }) {
  if (!data || typeof data !== 'object') return <p className="text-sm text-ink-500">{fallback}</p>
  const entries = Object.entries(data)
  if (!entries.length) return <p className="text-sm text-ink-500">{fallback}</p>
  return (
    <dl className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2 text-sm">
          <dt className="text-ink-500 capitalize">{k.replace(/_/g, ' ')}:</dt>
          <dd className="text-ink-800">{String(v)}</dd>
        </div>
      ))}
    </dl>
  )
}
