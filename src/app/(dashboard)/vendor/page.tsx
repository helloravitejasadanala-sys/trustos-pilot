'use client'

import { useEffect, useState } from 'react'
import { inferCategory } from '@/lib/vendor-categories'
import { StatusChip } from '@/components/ui'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Plus, Calendar, Clock, PoundSterling, MessageCircle, ChevronRight, Loader2, AlertCircle, CheckCircle2, Circle, Copy, Check 
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Project {
  id: string
  title: string
  slug: string
  status: string
  eventDate: string | null
  location: string | null
  budget: string | null
  client: { name: string | null } | null
  updatedAt: string
}

const statusDot: Record<string, string> = {
  LEAD: 'bg-neutral-300',
  QUESTIONNAIRE_SENT: 'bg-amber-400',
  QUESTIONNAIRE_COMPLETED: 'bg-emerald-400',
  PROPOSAL_SENT: 'bg-blue-400',
  PROPOSAL_ACCEPTED: 'bg-emerald-500',
  CONTRACT_SENT: 'bg-amber-400',
  CONTRACT_SIGNED: 'bg-emerald-500',
  DEPOSIT_PAID: 'bg-emerald-500',
  FULLY_PAID: 'bg-emerald-600',
  COMPLETED: 'bg-neutral-800',
  CANCELLED: 'bg-red-400',
}

export default function VendorDashboard() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/vendor/projects')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Stage 5 — personalise labels by category. Inferred from projects;
  // does not change any data or behaviour.
  const category = inferCategory({ projectTypes: projects.map(p => p.type).filter(Boolean) as string[] })

  const todaysWork = projects.filter(p => p.eventDate && p.eventDate.startsWith(todayStr))
  const upcoming = projects.filter(p => p.eventDate && new Date(p.eventDate) > today && !['COMPLETED', 'CANCELLED'].includes(p.status))
    .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime())
  const needsAction = projects.filter(p => ['LEAD', 'QUESTIONNAIRE_COMPLETED', 'PROPOSAL_ACCEPTED'].includes(p.status))
  const pendingPayments = projects.filter(p => ['CONTRACT_SIGNED', 'DEPOSIT_PAID'].includes(p.status))

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="space-y-3 w-64">
          <div className="skeleton h-8 w-32" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 px-5 py-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-ink-900 tracking-tight">Your workspace</h1>
            <p className="text-xs text-ink-400 mt-0.5">{category.label} · {projects.length} {category.bookingWord}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="w-9 h-9 rounded-xl bg-ink-900 text-white flex items-center justify-center hover:bg-ink-800 transition active:scale-95">
            <Plus size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-5 space-y-5 pb-24">
        {/* Today's work */}
        {todaysWork.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Today</h2>
            <div className="space-y-2">
              {todaysWork.map(p => <ProjectRow key={p.id} project={p} />)}
            </div>
          </section>
        )}

        {/* Needs action */}
        {needsAction.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertCircle size={12} />
              Needs your attention
            </h2>
            <div className="space-y-2">
              {needsAction.map(p => <ProjectRow key={p.id} project={p} highlight />)}
            </div>
          </section>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Upcoming {category.bookingWord}</h2>
            <div className="space-y-2">
              {upcoming.slice(0, 3).map(p => <ProjectRow key={p.id} project={p} />)}
            </div>
          </section>
        )}

        {/* Pending payments */}
        {pendingPayments.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <PoundSterling size={12} />
              Awaiting payment
            </h2>
            <div className="space-y-2">
              {pendingPayments.map(p => <ProjectRow key={p.id} project={p} />)}
            </div>
          </section>
        )}

        {/* All projects */}
        <section>
          <h2 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">All projects</h2>
          {projects.length === 0 ? (
            <EmptyState onCreate={() => setShowCreate(true)} />
          ) : (
            <div className="space-y-2">
              {projects.map(p => <ProjectRow key={p.id} project={p} />)}
            </div>
          )}
        </section>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-neutral-100 px-6 py-2">
        <div className="max-w-xl mx-auto flex justify-around">
          <NavItem href="/vendor" icon={Calendar} label="Work" active />
          <NavItem href="/vendor/templates" icon={MessageCircle} label="Templates" />
          <NavItem href="/vendor/analytics" icon={PoundSterling} label="Earnings" />
        </div>
      </nav>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={fetchProjects} />}
    </div>
  )
}

function ProjectRow({ project, highlight }: { project: any; highlight?: boolean }) {
  const dotColor = statusDot[project.status] || 'bg-neutral-300'
  const isToday = project.eventDate && project.eventDate.startsWith(new Date().toISOString().split('T')[0])
  const [copied, setCopied] = useState(false)
  const inv = project.invitation

  // STAGE 2 — the vendor copies the secure link here.
  // This row is deliberately NOT a link: /vendor/projects/[slug] does
  // not exist yet (audit issue C7), and a row that 404s is worse than
  // a row that does one useful thing.
  async function copyLink(e: React.MouseEvent) {
    e.preventDefault()
    if (!inv?.url) return
    try {
      await navigator.clipboard.writeText(inv.url)
      setCopied(true)
      toast.success('Secure link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy. Long-press the link to copy it manually.')
    }
  }

  return (
    <div className={`card p-4 ${highlight ? 'border-amber-200/60 bg-amber-50/30' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
        <div className="flex-1 min-w-0">
          <a href={`/vendor/projects/${project.slug}`} className="text-sm font-medium text-ink-900 truncate hover:underline block">{project.title}</a>
          <div className="flex items-center gap-3 mt-0.5">
            {project.eventDate && (
              <span className={`text-xs flex items-center gap-1 ${isToday ? 'text-emerald-600 font-medium' : 'text-ink-400'}`}>
                <Calendar size={11} />
                {isToday ? 'Today' : new Date(project.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {project.location && (
              <span className="text-xs text-ink-400 truncate">{project.location}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {inv ? (
            <p className="text-xs text-ink-400 truncate">
              {inv.expired
                ? 'Link expired'
                : inv.openedAt
                  ? `Opened ${new Date(inv.openedAt).toLocaleDateString('en-GB')}`
                  : 'Not opened yet'}
              {inv.email ? ` · ${inv.email}` : ''}
            </p>
          ) : (
            <p className="text-xs text-ink-400">No invitation link</p>
          )}
        </div>
        {inv && !inv.expired && (
          <button
            onClick={copyLink}
            className="text-xs font-medium text-ink-700 hover:text-ink-900 flex items-center gap-1.5 shrink-0 py-2 px-3 -my-1 rounded hover:bg-ink-50 transition"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy secure link'}
          </button>
        )}
      </div>
    </div>
  )
}

function NavItem({ href, icon: Icon, label, active }: any) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition ${
      active ? 'text-ink-900' : 'text-ink-300 hover:text-ink-500'
    }`}>
      <Icon size={18} strokeWidth={active ? 2 : 1.5} />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-3">
        <Calendar size={20} className="text-ink-300" />
      </div>
      <p className="text-sm text-ink-500 mb-1">No projects yet</p>
      <p className="text-xs text-ink-400 mb-4">Create your first client project</p>
      <button onClick={onCreate} className="btn-primary text-xs py-2.5 px-4">
        <Plus size={14} className="mr-1.5" />
        New project
      </button>
    </div>
  )
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('FIRST_BIRTHDAY')

  async function create() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await fetch('/api/vendor/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type }),
      })
      toast.success('Project created')
      onCreated()
      onClose()
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  const types = [
    { value: 'MATERNITY', emoji: '🤰' },
    { value: 'NEWBORN', emoji: '👶' },
    { value: 'FIRST_BIRTHDAY', emoji: '🎉' },
    { value: 'INDIAN_CEREMONY', emoji: '🪔' },
    { value: 'WEDDING', emoji: '💍' },
    { value: 'EVENT', emoji: '🎊' },
  ]

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-ink-900">New project</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-sand-50 flex items-center justify-center text-ink-400 hover:text-ink-600 transition">
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="label">Client name</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Priya Patel" className="w-full" autoFocus />
          </div>

          <div>
            <label className="label">Session type</label>
            <div className="grid grid-cols-3 gap-2">
              {types.map(t => (
                <button key={t.value} onClick={() => setType(t.value)}
                  className={`p-3 rounded-xl border-2 text-center transition active:scale-95 ${
                    type === t.value ? 'border-ink-900 bg-ink-50' : 'border-neutral-100'
                  }`}>
                  <span className="text-2xl">{t.emoji}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={create} disabled={!title || saving} className="btn-primary w-full py-3.5">
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  )
}
