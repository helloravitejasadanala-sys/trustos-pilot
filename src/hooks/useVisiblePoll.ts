'use client'

import { useEffect, useRef } from 'react'

/**
 * Soft background poll while the tab is visible.
 * Stable across renders: only `enabled` and `intervalMs` restart the loop.
 * Pauses when `document.hidden`; kicks soon on visibilitychange → visible.
 */
export function useVisiblePoll(options: {
  enabled: boolean
  intervalMs: number
  /** First tick delay after enable (default: run soon). */
  initialDelayMs?: number
  tick: () => void | Promise<void>
}) {
  const { enabled, intervalMs, initialDelayMs = 400 } = options
  const tickRef = useRef(options.tick)
  tickRef.current = options.tick

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function run() {
      if (cancelled) return
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(run, intervalMs)
        return
      }
      try {
        await tickRef.current()
      } catch {
        /* keep the interval alive */
      }
      if (!cancelled) timer = setTimeout(run, intervalMs)
    }

    timer = setTimeout(run, initialDelayMs)

    function onVisibility() {
      if (cancelled || document.hidden) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(run, 200)
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs, initialDelayMs])
}
