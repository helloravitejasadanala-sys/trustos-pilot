'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import ProjectCard from '@/components/vendor/ProjectCard'
import { CardSkeleton, EmptyState } from '@/components/ui'
import { PageHeader, PageLayout } from '@/components/layout'
import { useVendorChrome } from '@/components/vendor/VendorShell'
import { isArchivedProject, type VendorProject } from '@/lib/vendor-phase1'
import { parseJsonResponse } from '@/lib/safe-json'

export default function ProjectsPage() {
  const { openNewProject } = useVendorChrome()
  const [projects, setProjects] = useState<VendorProject[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'active' | 'archived'>('active')

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
    <PageLayout>
      <PageHeader title="Projects" />

      {/* Toolbar: segmented tabs + search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className="inline-flex self-start rounded-[var(--r-md)] border p-0.5"
          style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
          role="tablist"
          aria-label="Project filter"
        >
          {(['active', 'archived'] as const).map(key => {
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                className="rounded-[var(--r-sm)] px-3 py-1.5 text-[13px] font-semibold transition"
                style={
                  active
                    ? { background: 'var(--nav)', color: 'var(--on-dark)' }
                    : { background: 'transparent', color: 'var(--muted)' }
                }
              >
                {key === 'active' ? 'Active' : 'Archived'}
              </button>
            )
          })}
        </div>
        <div className="relative flex-1">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[color:var(--faint)]"
          />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by client, title or location"
            aria-label="Search projects"
            className="w-full border-[color:var(--line)] bg-[color:var(--panel)] text-[13px] text-[color:var(--ink)]"
            style={{ paddingLeft: 40, minHeight: 40, paddingTop: 8, paddingBottom: 8 }}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5"><CardSkeleton /><CardSkeleton /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tab === 'active' ? 'No projects yet' : 'No archived projects'}
          description={tab === 'active'
            ? 'Create a project to invite your first client.'
            : 'Archived projects will show here.'}
          action={tab === 'active' ? (
            <button type="button" className="btn btn-forest" onClick={openNewProject}>
              ＋ New project
            </button>
          ) : undefined}
        />
      ) : (
        <div
          className="panel overflow-hidden"
          style={{ padding: 0 }}
        >
          <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>
            {filtered.map(p => <ProjectCard key={p.id} project={p} onChanged={load} />)}
          </div>
        </div>
      )}
    </PageLayout>
  )
}
