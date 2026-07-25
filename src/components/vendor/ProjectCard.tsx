'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Calendar, MoreVertical } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { StatusChip } from '@/components/ui'
import { hasUnread } from '@/lib/unread'
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
  const unread = hasUnread(project.id, project.lastClientMessageAt)

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
    <div
      className="relative flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ background: 'var(--panel)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--canvas-2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--panel)' }}
    >
      <Link
        href={`/vendor/projects/${project.slug}`}
        className="min-w-0 flex-1"
        style={{ color: 'var(--ink)' }}
      >
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[14.5px] font-bold" style={{ color: 'var(--ink)' }}>
            {project.title}
          </h3>
          <StatusChip status={project.status} />
          {unread && (
            <span
              className="num shrink-0"
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: 'var(--coral-deep, #c45c3e)',
                letterSpacing: '0.02em',
              }}
            >
              NEW
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--muted)' }}>
          <span>{project.client?.name || project.invitation?.email || 'No client yet'}</span>
          {project.eventDate && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} aria-hidden />
              {new Date(project.eventDate).toLocaleDateString('en-GB')}
            </span>
          )}
          {project.location && <span className="truncate">{project.location}</span>}
        </div>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>Current:</span> {na.label}
          <span className="mx-1.5" style={{ color: 'var(--faint)' }}>·</span>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>Next:</span> {na.nextAction}
        </p>
      </Link>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          disabled={busy}
          className="flex h-10 w-10 items-center justify-center rounded-[var(--r-md)]"
          style={{ color: 'var(--muted)' }}
          aria-label="Project actions"
        >
          <MoreVertical size={17} />
        </button>
        {open && (
          <div
            className="absolute right-0 z-10 mt-1 w-44 py-1 text-sm shadow-[var(--sh)]"
            style={{
              borderRadius: 'var(--r-lg)',
              border: '1px solid var(--line)',
              background: 'var(--panel)',
              color: 'var(--ink)',
            }}
          >
            <button
              type="button"
              className="w-full px-3 py-2 text-left"
              style={{ color: 'var(--ink)' }}
              onClick={() => {
                const title = prompt('Project title', project.title)
                if (title?.trim()) patch({ title: title.trim() })
              }}
            >
              Edit
            </button>
            {!archived && (
              <button
                type="button"
                className="w-full px-3 py-2 text-left"
                style={{ color: 'var(--ink)' }}
                onClick={() => patch({ archive: true })}
              >
                Archive
              </button>
            )}
            {archived && (
              <button
                type="button"
                className="w-full px-3 py-2 text-left"
                style={{ color: 'var(--ink)' }}
                onClick={() => patch({ unarchive: true })}
              >
                Restore
              </button>
            )}
            {project.status !== 'CANCELLED' && (
              <button
                type="button"
                className="w-full px-3 py-2 text-left"
                style={{ color: 'var(--ink)' }}
                onClick={() => patch({ cancel: true })}
              >
                Cancel
              </button>
            )}
            {test && (
              <button
                type="button"
                className="w-full px-3 py-2 text-left"
                style={{ color: 'var(--coral-deep)' }}
                onClick={remove}
              >
                Delete test project
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
