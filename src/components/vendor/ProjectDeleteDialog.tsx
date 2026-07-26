'use client'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export type ProjectDeleteSummary = {
  title: string
  clientName: string | null | undefined
  /** Completed + pending payment rows. */
  paymentCount: number
  /** When unknown (list card), omit the exact count. */
  fileCount?: number | null
  /** Offer Archive as the primary action (active / not yet archived). */
  canArchive: boolean
  /** Soft copy for completed/archived — less alarm, still permanent. */
  simple: boolean
}

/**
 * Delete confirmation for test projects.
 * Active: Archive is primary; Delete is quiet secondary.
 * Completed/archived: simple permanent-delete confirm.
 */
export function ProjectDeleteDialog({
  open,
  summary,
  busy,
  onClose,
  onArchive,
  onDelete,
}: {
  open: boolean
  summary: ProjectDeleteSummary
  busy: boolean
  onClose: () => void
  onArchive?: () => void | Promise<void>
  onDelete: () => void | Promise<void>
}) {
  const client = summary.clientName?.trim() || 'No client linked'
  const payments =
    summary.paymentCount === 0
      ? 'No payments recorded'
      : `${summary.paymentCount} payment${summary.paymentCount === 1 ? '' : 's'} recorded`
  const files =
    summary.fileCount == null
      ? 'Any delivery files on this booking'
      : summary.fileCount === 0
        ? 'No files linked'
        : `${summary.fileCount} file${summary.fileCount === 1 ? '' : 's'} linked`

  if (summary.simple || !summary.canArchive || !onArchive) {
    return (
      <ConfirmDialog
        open={open}
        title="Delete this booking permanently?"
        onClose={onClose}
        busy={busy}
        primaryLabel="Delete permanently"
        primaryVariant="danger"
        onPrimary={onDelete}
        secondaryLabel="Keep it"
        onSecondary={onClose}
        secondaryVariant="ghost"
      >
        <p style={{ margin: '0 0 10px' }}>
          <strong>{summary.title}</strong> will be removed. This cannot be undone.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)' }}>
          <li>Client: {client}</li>
          <li>{payments}</li>
          <li>{files}</li>
        </ul>
      </ConfirmDialog>
    )
  }

  return (
    <ConfirmDialog
      open={open}
      title="Remove this booking?"
      onClose={onClose}
      busy={busy}
      primaryLabel="Archive instead"
      primaryVariant="forest"
      onPrimary={onArchive}
      secondaryLabel="Delete permanently"
      onSecondary={onDelete}
      secondaryVariant="quiet"
    >
      <p style={{ margin: '0 0 8px' }}>
        Deleting <strong>{summary.title}</strong> removes it for good. Archive keeps it on your
        Archived shelf so you can restore later.
      </p>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--muted)' }}>
        If you delete, you lose:
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)' }}>
        <li>Client: {client}</li>
        <li>{payments}</li>
        <li>{files}</li>
      </ul>
    </ConfirmDialog>
  )
}
