'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Calendar, MoreVertical } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { StatusChip } from '@/components/ui'
import { isArchivedProject, isTestProject, projectNextAction, type VendorProject } from '@/lib/vendor-phase1'

export default function ProjectCard({
  project,
  onChanged,
}: {
  project: VendorProject
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const na = projectNextAction(project.status)
  const archived = isArchivedProject(project)
  const test = isTestProject(project)

  async function patch(body: Record<string, unknown>) {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/vendor/projects/${project.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      toast.success('Project updated')
      onChanged()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  async function remove() {
    if (busy || !test || !confirm('Delete this test project permanently?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/vendor/projects/${project.slug}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      toast.success('Test project deleted')
      onChanged()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative flex items-center gap-3 px-4 py-3 hover:bg-forest-50/40 transition-colors">
      <Link href={`/vendor/projects/${project.slug}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold text-forest-950 truncate">{project.title}</h3>
          <StatusChip status={project.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-forest-500">
          <span className="text-forest-600">{project.client?.name || project.invitation?.email || 'No client yet'}</span>
          {project.eventDate && (
            <span className="inline-flex items-center gap-1"><Calendar size={12} />{new Date(project.eventDate).toLocaleDateString('en-GB')}</span>
          )}
          {project.location && <span className="truncate">{project.location}</span>}
          <span className="text-forest-400">· {na.nextAction}</span>
        </div>
      </Link>
      <div className="relative shrink-0">
        <button
          onClick={() => setOpen(v => !v)}
          disabled={busy}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-forest-400 hover:bg-forest-100 hover:text-forest-700"
          aria-label="Project actions"
        >
          <MoreVertical size={17} />
        </button>
        {open && (
          <div className="absolute right-0 mt-1 w-44 rounded-xl border border-forest-100 bg-white shadow-elevated z-10 py-1 text-sm">
            <button className="w-full text-left px-3 py-2 hover:bg-forest-50" onClick={() => {
              const title = prompt('Project title', project.title)
              if (title?.trim()) patch({ title: title.trim() })
            }}>Edit</button>
            {!archived && <button className="w-full text-left px-3 py-2 hover:bg-forest-50" onClick={() => patch({ archive: true })}>Archive</button>}
            {archived && <button className="w-full text-left px-3 py-2 hover:bg-forest-50" onClick={() => patch({ unarchive: true })}>Restore</button>}
            {project.status !== 'CANCELLED' && <button className="w-full text-left px-3 py-2 hover:bg-forest-50" onClick={() => patch({ cancel: true })}>Cancel</button>}
            {test && <button className="w-full text-left px-3 py-2 text-red-700 hover:bg-red-50" onClick={remove}>Delete test project</button>}
          </div>
        )}
      </div>
    </div>
  )
}
