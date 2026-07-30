'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { ActionMenu, ActionMenuItem, StatusChip } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProjectDeleteDialog } from '@/components/vendor/ProjectDeleteDialog'
import { RenameBookingDialog } from '@/components/vendor/RenameBookingDialog'
import { hasUnread } from '@/lib/unread'
import {
  isArchivedProject,
  isTestProject,
  isVendorClosedProject,
  projectNextAction,
  type VendorProject,
} from '@/lib/vendor-phase1'

type ConfirmKind = 'archive' | 'cancel' | 'delete' | 'rename' | null

export default function ProjectCard({
  project,
  onChanged,
}: {
  project: VendorProject
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmKind>(null)
  const na = projectNextAction(project.status)
  const archived = isArchivedProject(project)
  const test = isTestProject(project)
  const unread = hasUnread(project.id, project.lastClientMessageAt)
  const closed = isVendorClosedProject(project)
  const paymentCount = (project.payments || []).length

  async function patch(body: Record<string, unknown>, success: string) {
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
      toast.success(success)
      setConfirm(null)
      onChanged()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (busy || !test) return
    setBusy(true)
    try {
      const res = await fetch(`/api/vendor/projects/${project.slug}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      toast.success('Test project deleted')
      setConfirm(null)
      onChanged()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="relative flex min-h-[64px] items-center gap-2 px-3 py-3.5 transition-colors sm:gap-3 sm:px-4"
      style={{ background: 'var(--panel)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--canvas-2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--panel)' }}
    >
      <Link
        href={`/vendor/projects/${project.slug}`}
        className="vendor-pressable min-w-0 flex-1"
        style={{ color: 'var(--ink)', textDecoration: 'none' }}
      >
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-bold" style={{ color: 'var(--ink)' }}>
            {project.title}
          </h3>
          <StatusChip status={project.status} />
          {unread && (
            <span
              className="num shrink-0"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--coral-deep, #c45c3e)',
                letterSpacing: '0.02em',
              }}
            >
              NEW
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px]" style={{ color: 'var(--muted)' }}>
          <span>{project.client?.name || project.invitation?.email || 'No client yet'}</span>
          {project.eventDate && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={13} aria-hidden />
              {new Date(project.eventDate).toLocaleDateString('en-GB')}
            </span>
          )}
          {project.location && <span className="truncate">{project.location}</span>}
        </div>
        <p className="mt-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>Next:</span> {na.nextAction}
        </p>
      </Link>
      <span
        className="pointer-events-none hidden shrink-0 text-[13px] font-semibold text-forest-700 sm:inline"
        aria-hidden
      >
        Open →
      </span>
      <div className="relative shrink-0">
        <ActionMenu
          disabled={busy}
          ariaLabel="Project actions"
          triggerClassName="flex h-11 w-11 items-center justify-center rounded-lg text-[color:var(--muted)] hover:bg-forest-100 hover:text-forest-700"
        >
          {({ close }) => (
            <>
              <ActionMenuItem
                onSelect={() => {
                  close()
                  setConfirm('rename')
                }}
              >
                Rename
              </ActionMenuItem>
              {!archived && (
                <ActionMenuItem
                  onSelect={() => {
                    close()
                    setConfirm('archive')
                  }}
                >
                  Archive
                </ActionMenuItem>
              )}
              {archived && (
                <ActionMenuItem
                  onSelect={() => {
                    close()
                    void patch({ unarchive: true }, 'Booking restored to your active list')
                  }}
                >
                  Restore
                </ActionMenuItem>
              )}
              {project.status !== 'CANCELLED' && (
                <ActionMenuItem
                  onSelect={() => {
                    close()
                    setConfirm('cancel')
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
                    setConfirm('delete')
                  }}
                >
                  Delete test project
                </ActionMenuItem>
              )}
            </>
          )}
        </ActionMenu>
      </div>

      <RenameBookingDialog
        open={confirm === 'rename'}
        initialTitle={project.title}
        busy={busy}
        onClose={() => !busy && setConfirm(null)}
        onSave={title => patch({ title }, 'Booking name updated')}
      />

      <ConfirmDialog
        open={confirm === 'archive'}
        title="Archive this booking?"
        onClose={() => !busy && setConfirm(null)}
        busy={busy}
        primaryLabel="Archive"
        onPrimary={() => patch({ archive: true }, 'Booking archived — find it under Archived')}
      >
        <p style={{ margin: 0 }}>
          <strong>{project.title}</strong> moves to your Archived shelf. You can restore it anytime —
          nothing is deleted.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'cancel'}
        title="Cancel this booking?"
        onClose={() => !busy && setConfirm(null)}
        busy={busy}
        primaryLabel="Cancel booking"
        primaryVariant="danger"
        onPrimary={() => patch({ cancel: true }, 'Booking cancelled')}
      >
        <p style={{ margin: 0 }}>
          <strong>{project.title}</strong> will leave your active work. Prefer Archive if you might
          need it again.
        </p>
      </ConfirmDialog>

      <ProjectDeleteDialog
        open={confirm === 'delete'}
        busy={busy}
        onClose={() => !busy && setConfirm(null)}
        onArchive={
          archived
            ? undefined
            : () => patch({ archive: true }, 'Booking archived — find it under Archived')
        }
        onDelete={remove}
        summary={{
          title: project.title,
          clientName: project.client?.name || project.invitation?.email,
          paymentCount,
          fileCount: null,
          canArchive: !archived,
          simple: archived || closed || project.status === 'COMPLETED',
        }}
      />
    </div>
  )
}
