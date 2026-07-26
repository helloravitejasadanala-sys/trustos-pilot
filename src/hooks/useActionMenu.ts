'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export type MenuPos = { top?: number; bottom?: number; left: number }

/**
 * Shared dismissible menu behaviour:
 * outside click, Escape, route change, scroll, and optional closeKey (tab switch).
 * Pair with a fixed portal so the menu never clips inside overflow containers.
 */
export function useActionMenu(opts?: {
  menuWidth?: number
  estimatedHeight?: number
  /** Close when this value changes (e.g. Active/Archived tab). */
  closeKey?: unknown
}) {
  const menuWidth = opts?.menuWidth ?? 176
  const estimatedHeight = opts?.estimatedHeight ?? 220
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen(v => !v), [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Route change
  useEffect(() => {
    close()
  }, [pathname, close])

  // Tab switch / search / caller-driven close
  useEffect(() => {
    close()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally close when closeKey changes
  }, [opts?.closeKey])

  function placeMenu() {
    const btn = triggerRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow
    let left = rect.right - menuWidth
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8))
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
    return () => {
      window.removeEventListener('resize', onReposition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, menuWidth, estimatedHeight])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      close()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    function onScroll() {
      close()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKey)
    // Capture scroll on any ancestor (lists, workspace shell).
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, close])

  return {
    open,
    close,
    toggle,
    setOpen,
    mounted,
    menuPos,
    menuWidth,
    triggerRef,
    menuRef,
  }
}
