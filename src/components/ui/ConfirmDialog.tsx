'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X } from 'lucide-react'

type BtnVariant = 'forest' | 'danger' | 'ghost' | 'quiet'

function btnClass(variant: BtnVariant) {
  if (variant === 'forest') return 'btn btn-forest'
  if (variant === 'danger') {
    return 'btn'
  }
  if (variant === 'quiet') {
    return 'btn btn-ghost'
  }
  return 'btn btn-ghost'
}

function btnStyle(variant: BtnVariant): CSSProperties | undefined {
  if (variant === 'danger') {
    return {
      background: 'transparent',
      border: '1px solid color-mix(in srgb, var(--coral-deep, #c45c3e) 35%, var(--line))',
      color: 'var(--coral-deep, #c45c3e)',
    }
  }
  if (variant === 'quiet') {
    return { color: 'var(--muted)', fontWeight: 500 }
  }
  return undefined
}

/**
 * Shared in-app confirm (never window.confirm).
 * Closes on Escape, backdrop click, or the X / dismiss control.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  onClose,
  primaryLabel,
  onPrimary,
  primaryVariant = 'forest',
  secondaryLabel,
  onSecondary,
  secondaryVariant = 'ghost',
  busy = false,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  primaryLabel: string
  onPrimary: () => void | Promise<void>
  primaryVariant?: BtnVariant
  secondaryLabel?: string
  onSecondary?: () => void | Promise<void>
  secondaryVariant?: BtnVariant
  busy?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, busy, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={e => {
        if (busy) return
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-2xl shadow-[var(--sh-lg)]"
        style={{ background: 'var(--panel)', color: 'var(--ink)', border: '1px solid var(--line)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--line-soft)' }}
        >
          <h2 id="confirm-dialog-title" className="text-[17px] font-semibold leading-snug" style={{ margin: 0 }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-2"
            style={{ color: 'var(--muted)' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 text-[14px] leading-relaxed" style={{ color: 'var(--ink)' }}>
          {children}
        </div>
        <div
          className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:justify-end"
          style={{ borderTop: '1px solid var(--line-soft)' }}
        >
          {secondaryLabel && onSecondary ? (
            <button
              type="button"
              className={btnClass(secondaryVariant)}
              style={{ ...btnStyle(secondaryVariant), minHeight: 44 }}
              disabled={busy}
              onClick={() => void onSecondary()}
            >
              {secondaryLabel}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ minHeight: 44 }}
              disabled={busy}
              onClick={onClose}
            >
              Keep it
            </button>
          )}
          <button
            type="button"
            className={btnClass(primaryVariant)}
            style={{ ...btnStyle(primaryVariant), minHeight: 44 }}
            disabled={busy}
            onClick={() => void onPrimary()}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : primaryLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
