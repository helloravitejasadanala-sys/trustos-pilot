'use client'

import { type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import { useActionMenu } from '@/hooks/useActionMenu'

/**
 * Portal ⋮ menu with shared dismiss rules (outside, Escape, route, scroll, closeKey).
 */
export function ActionMenu({
  children,
  disabled,
  ariaLabel = 'More actions',
  closeKey,
  menuWidth = 176,
  estimatedHeight = 220,
  triggerClassName,
  triggerStyle,
}: {
  children: (api: { close: () => void }) => ReactNode
  disabled?: boolean
  ariaLabel?: string
  /** Close when this changes (Active/Archived tab, search, workspace tab). */
  closeKey?: unknown
  menuWidth?: number
  estimatedHeight?: number
  triggerClassName?: string
  triggerStyle?: CSSProperties
}) {
  const menu = useActionMenu({ menuWidth, estimatedHeight, closeKey })

  const portal =
    menu.open && menu.mounted && menu.menuPos
      ? createPortal(
          <div
            ref={menu.menuRef}
            role="menu"
            className="py-1 text-sm shadow-[var(--sh)]"
            style={{
              position: 'fixed',
              top: menu.menuPos.top,
              bottom: menu.menuPos.bottom,
              left: menu.menuPos.left,
              width: menu.menuWidth,
              zIndex: 80,
              borderRadius: 'var(--r-lg)',
              border: '1px solid var(--line)',
              background: 'var(--panel)',
              color: 'var(--ink)',
            }}
          >
            {children({ close: menu.close })}
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={e => {
          e.stopPropagation()
          menu.toggle()
        }}
        disabled={disabled}
        className={
          triggerClassName ||
          'flex h-10 w-10 items-center justify-center rounded-[var(--r-md)]'
        }
        style={triggerStyle ?? { color: 'var(--muted)' }}
        aria-label={ariaLabel}
        aria-expanded={menu.open}
        aria-haspopup="menu"
      >
        <MoreVertical size={17} />
      </button>
      {portal}
    </>
  )
}

/** Standard menu row for ActionMenu portals. */
export function ActionMenuItem({
  children,
  onSelect,
  tone = 'default',
}: {
  children: ReactNode
  onSelect: () => void
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="w-full px-3 py-2.5 text-left"
      style={{
        color: tone === 'danger' ? 'var(--coral-deep)' : 'var(--ink)',
      }}
      onClick={onSelect}
    >
      {children}
    </button>
  )
}
