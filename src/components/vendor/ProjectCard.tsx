'use client'

import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, MoreVertical } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { StatusChip } from '@/components/ui'
import { hasUnread } from '@/lib/unread'
import { isArchivedProject, isTestProject, projectNextAction, type VendorProject } from '@/lib/vendor-phase1'

const MENU_WIDTH = 176
/** Enough room for Edit / Archive / Cancel / Delete test. */
const MENU_EST_HEIGHT = 220

type MenuPos = { top?: number; bottom?: number; left: number }

export default function ProjectCard({
  project,
  onChanged,
}: {
  project: VendorProject
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const na = projectNextAction(project.status)
  const archived = isArchivedProject(project)
  const test = isTestProject(project)
  const unread = hasUnread(project.id, project.lastClientMessageAt)

  useEffect(() => { setMounted(true) }, [])

  function placeMenu() {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < MENU_EST_HEIGHT && rect.top > spaceBelow
    let left = rect.right - MENU_WIDTH
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8))
    if (openUp) {
      setMenuPos({ bottom: window.innerHeight - rect.top + 4, left })
    } else {
      setMenuPos({ top: rect.bottom + 4, left })
    }
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null)
      return
    }
    placeMenu()
    function onReposition() {
      placeMenu()
    }
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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

  const menu = open && mounted && menuPos
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="py-1 text-sm shadow-[var(--sh)]"
          style={{
            position: 'fixed',
            top: menuPos.top,
            bottom: menuPos.bottom,
            left: menuPos.left,
            width: MENU_WIDTH,
            zIndex: 80,
            borderRadius: 'var(--r-lg)',
            border: '1px solid var(--line)',
            background: 'var(--panel)',
            color: 'var(--ink)',
          }}
        >
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2.5 text-left"
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
              role="menuitem"
              className="w-full px-3 py-2.5 text-left"
              style={{ color: 'var(--ink)' }}
              onClick={() => patch({ archive: true })}
            >
              Archive
            </button>
          )}
          {archived && (
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2.5 text-left"
              style={{ color: 'var(--ink)' }}
              onClick={() => patch({ unarchive: true })}
            >
              Restore
            </button>
          )}
          {project.status !== 'CANCELLED' && (
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2.5 text-left"
              style={{ color: 'var(--ink)' }}
              onClick={() => patch({ cancel: true })}
            >
              Cancel
            </button>
          )}
          {test && (
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2.5 text-left"
              style={{ color: 'var(--coral-deep)' }}
              onClick={remove}
            >
              Delete test project
            </button>
          )}
        </div>,
        document.body,
      )
    : null

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
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(v => !v)}
          disabled={busy}
          className="flex h-10 w-10 items-center justify-center rounded-[var(--r-md)]"
          style={{ color: 'var(--muted)' }}
          aria-label="Project actions"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <MoreVertical size={17} />
        </button>
        {menu}
      </div>
    </div>
  )
}
