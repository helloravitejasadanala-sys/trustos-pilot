'use client'

import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

/** In-app rename — never window.prompt (bad on mobile). */
export function RenameBookingDialog({
  open,
  initialTitle,
  busy = false,
  onClose,
  onSave,
}: {
  open: boolean
  initialTitle: string
  busy?: boolean
  onClose: () => void
  onSave: (title: string) => void | Promise<void>
}) {
  const [title, setTitle] = useState(initialTitle)

  useEffect(() => {
    if (open) setTitle(initialTitle)
  }, [open, initialTitle])

  const trimmed = title.trim()
  const canSave = trimmed.length > 0 && trimmed !== initialTitle.trim()

  return (
    <ConfirmDialog
      open={open}
      title="Rename booking"
      onClose={onClose}
      busy={busy}
      primaryLabel="Save name"
      onPrimary={async () => {
        if (!trimmed) return
        if (!canSave) {
          onClose()
          return
        }
        await onSave(trimmed)
      }}
      secondaryLabel="Cancel"
      onSecondary={onClose}
    >
      <label className="label" htmlFor="rename-booking-title">
        Booking name
      </label>
      <input
        id="rename-booking-title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
        disabled={busy}
        onKeyDown={e => {
          if (e.key === 'Enter' && canSave && !busy) {
            e.preventDefault()
            void onSave(trimmed)
          }
        }}
      />
    </ConfirmDialog>
  )
}
