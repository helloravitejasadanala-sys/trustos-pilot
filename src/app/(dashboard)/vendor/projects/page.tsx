'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import ProjectCard from '@/components/vendor/ProjectCard'
import NewProjectModal from '@/components/vendor/NewProjectModal'
import { CardSkeleton, EmptyState } from '@/components/ui'
import { isArchivedProject, type VendorProject } from '@/lib/vendor-phase1'
import { parseJsonResponse } from '@/lib/safe-json'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<VendorProject[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [showCreate, setShowCreate] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/vendor/projects')
      const { ok, data } = await parseJsonResponse<{ projects?: VendorProject[] }>(res)
      if (ok) setProjects(data.projects || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter(p => {
      const archived = isArchivedProject(p)
      if (tab === 'active' ? archived : !archived) return false
      if (!q) return true
      return [p.title, p.client?.name, p.client?.email, p.location].some(v => (v ?? '').toLowerCase().includes(q))
    })
  }, [projects, query, tab])

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
      <div className="flex items-center justify-between gap-4 border-b border-forest-100 pb-4 mb-4">
        <h1 className="font-display text-xl text-forest-950">Projects</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary shrink-0">
          <Plus size={16} className="mr-1.5" />New project
        </button>
      </div>

      {/* Toolbar: segmented tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="inline-flex rounded-lg border border-forest-100 bg-white p-0.5 self-start">
          {(['active', 'archived'] as const).map(key => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${tab === key ? 'bg-forest-950 text-paper-50' : 'text-forest-600 hover:text-forest-900'}`}>
              {key === 'active' ? 'Active' : 'Archived'}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-forest-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by client, title or location" className="pl-9 !min-h-0 py-2 text-[13px]" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5"><CardSkeleton /><CardSkeleton /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tab === 'active' ? 'No active projects yet' : 'No archived projects'}
          description={tab === 'active'
            ? "Create a project with your client's name and email. We'll open it straight away and keep it here after refresh."
            : 'Projects you archive will appear here — nothing is deleted.'}
          action={tab === 'active' ? <button className="btn-primary" onClick={() => setShowCreate(true)}>Create a project</button> : undefined}
        />
      ) : (
        <div className="divide-y divide-forest-100 rounded-xl border border-forest-100 bg-white overflow-hidden">
          {filtered.map(p => <ProjectCard key={p.id} project={p} onChanged={load} />)}
        </div>
      )}

      {showCreate && <NewProjectModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  )
}
