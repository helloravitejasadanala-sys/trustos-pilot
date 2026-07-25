'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Calendar, Clock, ArrowRight, Activity } from 'lucide-react'
import { getNextAction } from '@/lib/journey'
import { isArchivedProject, type VendorProject } from '@/lib/vendor-phase1'
import { hasUnread } from '@/lib/unread'
import { parseJsonResponse } from '@/lib/safe-json'
import NewProjectModal from '@/components/vendor/NewProjectModal'
import { CardSkeleton } from '@/components/ui'
import { MessageSquare } from 'lucide-react'

const VENDOR_PRIORITY = ['QUESTIONNAIRE_COMPLETED', 'LEAD', 'DEPOSIT_PAID', 'FULLY_PAID', 'COMPLETED']
const ACTION_VERB: Record<string, string> = {
  LEAD: 'Send the secure invitation',
  QUESTIONNAIRE_COMPLETED: 'Prepare and send the proposal',
  DEPOSIT_PAID: 'Start delivery',
  FULLY_PAID: 'Complete the delivery',
  COMPLETED: 'Request a review',
}

type ActivityItem = { id: string; event: string; createdAt: string; project: { title: string; slug: string } | null }

export default function TodayPage() {
  const [projects, setProjects] = useState<VendorProject[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [business, setBusiness] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  async function load() {
    setLoadError(null)
    try {
      const [res, actRes, meRes] = await Promise.all([
        fetch('/api/vendor/projects'),
        fetch('/api/vendor/activity'),
        fetch('/api/auth/me'),
      ])
      if (res.status === 401 || meRes.status === 401) {
        setLoadError('Your session expired. Please sign in again.')
        return
      }
      if (res.status === 403) {
        setLoadError('This workspace is suspended. Contact support if you need access restored.')
        return
      }
      const { ok, data } = await parseJsonResponse<{ projects?: VendorProject[]; error?: string }>(res)
      if (!ok) {
        setLoadError(data.error || 'Could not load your projects. Please refresh and try again.')
        return
      }
      setProjects((data.projects || []).filter((p: VendorProject) => !isArchivedProject(p)))
      const act = await parseJsonResponse<{ activity?: ActivityItem[] }>(actRes)
      if (act.ok) setActivity(act.data.activity || [])
      const me = await parseJsonResponse<{ user?: { vendorProfile?: { businessName?: string } } }>(meRes)
      if (me.ok) setBusiness(me.data.user?.vendorProfile?.businessName || '')
    } catch {
      setLoadError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const todayStr = new Date().toISOString().split('T')[0]
  const todaysWork = projects.filter(p => p.eventDate?.startsWith(todayStr))
  const waitingVendor = projects.filter(p => getNextAction(p.status).responsible === 'Vendor')
  const waitingClient = projects.filter(p => getNextAction(p.status).responsible === 'Client')
  const vendorActionable = waitingVendor
    .map(p => ({ p, na: getNextAction(p.status) }))
    .sort((a, b) => {
      const ai = VENDOR_PRIORITY.indexOf(a.p.status)
      const bi = VENDOR_PRIORITY.indexOf(b.p.status)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  const todaysAction = vendorActionable[0] ?? null

  const deadlines = useMemo(() => {
    return projects
      .filter(p => p.eventDate && new Date(p.eventDate) >= new Date())
      .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime())
      .slice(0, 5)
  }, [projects])

  // Unread = a client message newer than the last time this device opened
  // that project's conversation. Cleared when the vendor opens Messages.
  const unreadProjects = projects.filter(p => hasUnread(p.id, p.lastClientMessageAt))

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-4">
        <CardSkeleton /><CardSkeleton />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
        <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
          <h2 className="font-display text-xl text-forest-950">We couldn&apos;t open your workspace</h2>
          <p className="mt-2 text-[14px] text-forest-700">{loadError}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button onClick={() => { setLoading(true); load() }} className="btn-primary">Try again</button>
            <Link href="/login" className="btn-secondary">Sign in again</Link>
          </div>
        </div>
      </div>
    )
  }

  // First run — an empty real workspace greets the owner and points at the
  // single next action, rather than showing five empty lists (Section C/D).
  if (projects.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
        <div className="flex items-center justify-between gap-4 border-b border-forest-100 pb-4 mb-8">
          <div>
            <h1 className="font-display text-xl text-forest-950">Today</h1>
            <p className="text-[13px] text-forest-500">
              {business ? `${business} · your clear next steps` : 'Your clear next steps'}
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-lg rounded-xl border border-forest-200 bg-white px-6 py-10 text-center">
          <h2 className="font-display text-2xl text-forest-950">Welcome{business ? ` to ${business}` : ''}.</h2>
          <p className="mt-2 text-[14px] text-forest-600">
            This is your TrustOS workspace. Create a project, invite your client with a secure link, and we&apos;ll keep the next step obvious.
          </p>
          <ol className="mt-5 text-left text-[13px] text-forest-600 space-y-2 mx-auto max-w-sm">
            <li>1. Create a project with your client&apos;s name and email</li>
            <li>2. Copy their secure link from the project page</li>
            <li>3. Come back here — Today will show what needs you next</li>
          </ol>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-5">
            <Plus size={16} className="mr-1.5" />Create your first project
          </button>
        </div>
        {showCreate && <NewProjectModal onClose={() => setShowCreate(false)} onCreated={load} />}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 border-b border-forest-100 pb-4 mb-5">
        <div>
          <h1 className="font-display text-xl text-forest-950">Today</h1>
          <p className="text-[13px] text-forest-500">
            {business ? `${business} · your clear next steps` : 'Your clear next steps'}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary shrink-0">
          <Plus size={16} className="mr-1.5" />New project
        </button>
      </div>

      {/* Unread client messages */}
      {unreadProjects.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-amber-900">
            <MessageSquare size={15} />
            {unreadProjects.length} new client {unreadProjects.length === 1 ? 'message' : 'messages'}
          </p>
          <div className="mt-2 space-y-1">
            {unreadProjects.map(p => (
              <Link key={p.id} href={`/vendor/projects/${p.slug}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-[13px] hover:bg-amber-100/60">
                <span className="truncate font-medium text-amber-950">{p.title}</span>
                <span className="shrink-0 text-amber-700">{p.client?.name || 'Client'} · Open →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Operational action panel */}
      {todaysAction ? (
        <div className="mb-6 overflow-hidden rounded-xl border border-forest-200 bg-white">
          <div className="flex items-center gap-2 border-b border-forest-100 bg-forest-50/60 px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-forest-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-forest-600">Next action · you</p>
          </div>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-forest-950 truncate">{todaysAction.p.title}</p>
              <p className="text-[13px] text-forest-600 mt-0.5">
                {ACTION_VERB[todaysAction.p.status] ?? todaysAction.na.nextAction}
                {todaysAction.p.client?.name ? ` · ${todaysAction.p.client.name}` : ''}
              </p>
            </div>
            <Link href={`/vendor/projects/${todaysAction.p.slug}`} className="btn-primary shrink-0">
              Open project <ArrowRight size={15} className="ml-1.5" />
            </Link>
          </div>
        </div>
      ) : projects.length > 0 ? (
        <div className="mb-6 rounded-xl border border-forest-100 bg-white px-4 py-3">
          <p className="text-sm font-medium text-forest-900">You&apos;re all caught up</p>
          <p className="text-[13px] text-forest-500 mt-0.5">Every active project is waiting on a client.</p>
        </div>
      ) : null}

      {/* Dense two-column work lists */}
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Today's work" empty="Nothing scheduled for today.">
          {todaysWork.map(p => <ProjectLine key={p.id} project={p} />)}
        </Section>
        <Section title="Waiting for you" empty="Nothing needs your action right now.">
          {waitingVendor.slice(0, 6).map(p => <ProjectLine key={p.id} project={p} />)}
        </Section>
        <Section title="Waiting for client" empty="No clients are blocking progress.">
          {waitingClient.slice(0, 6).map(p => <ProjectLine key={p.id} project={p} />)}
        </Section>
        <Section title="Upcoming deadlines" empty="No upcoming dates yet.">
          {deadlines.map(p => (
            <Link key={p.id} href={`/vendor/projects/${p.slug}`} className="flex items-center justify-between gap-3 py-2 border-b border-forest-50 last:border-0">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-forest-950 truncate">{p.title}</p>
                <p className="text-xs text-forest-500">{p.client?.name || 'No client yet'}</p>
              </div>
              <span className="text-xs text-forest-600 inline-flex items-center gap-1 shrink-0"><Clock size={13} />{new Date(p.eventDate!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            </Link>
          ))}
        </Section>

        <Section title="Recent activity" empty="Nothing has happened yet — create your first project to get started.">
          {activity.map(a => (
            <Link key={a.id} href={a.project ? `/vendor/projects/${a.project.slug}` : '/vendor/projects'} className="flex items-start gap-2.5 py-2.5 border-b border-forest-50 last:border-0">
              <Activity size={13} className="mt-0.5 shrink-0 text-forest-300" />
              <div className="min-w-0">
                <p className="text-[13px] text-forest-800 truncate">{a.event}{a.project ? <span className="text-forest-400"> · {a.project.title}</span> : null}</p>
                <p className="text-xs text-forest-400">{new Date(a.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </Link>
          ))}
        </Section>
      </div>

      {showCreate && <NewProjectModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  )
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children]
  const hasItems = items.some(Boolean) && !(items.length === 1 && !items[0])
  return (
    <section className="rounded-xl border border-forest-100 bg-white">
      <h2 className="border-b border-forest-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-forest-500">{title}</h2>
      <div className="px-4 py-1">
        {hasItems ? items : <p className="py-3 text-[13px] text-forest-400">{empty}</p>}
      </div>
    </section>
  )
}

function ProjectLine({ project }: { project: VendorProject }) {
  const na = getNextAction(project.status)
  return (
    <Link href={`/vendor/projects/${project.slug}`} className="flex items-start justify-between gap-3 py-2.5 border-b border-forest-50 last:border-0 hover:bg-forest-50/40 -mx-4 px-4 transition-colors">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-forest-950 truncate">{project.title}</p>
        <p className="text-xs text-forest-500 mt-0.5 truncate">{na.nextAction}</p>
      </div>
      {project.eventDate && (
        <span className="text-xs text-forest-500 inline-flex items-center gap-1 shrink-0">
          <Calendar size={13} />{new Date(project.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      )}
    </Link>
  )
}
