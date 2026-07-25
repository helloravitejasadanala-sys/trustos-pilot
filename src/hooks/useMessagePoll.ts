'use client'

import { useEffect, useRef } from 'react'

const DEFAULT_INTERVAL_MS = 5000

export type PollableMessage = {
  id: string
  type?: string | null
  content?: string | null
  createdAt?: string
  sender?: { name?: string | null; role?: string | null } | null
}

/**
 * Lightweight message polling — no WebSockets.
 * Pauses while the browser tab is hidden. Does not toast on the first
 * snapshot (seed), only on later inbound messages the recipient didn't send.
 */
export function useMessagePoll<T extends PollableMessage>(options: {
  enabled: boolean
  intervalMs?: number
  fetchMessages: () => Promise<T[] | null>
  onMessages: (messages: T[]) => void
  isInbound: (message: T) => boolean
  onInbound?: (messages: T[]) => void
}) {
  const { enabled, intervalMs = DEFAULT_INTERVAL_MS } = options
  const optsRef = useRef(options)
  optsRef.current = options

  const knownIdsRef = useRef<Set<string>>(new Set())
  const primedRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      primedRef.current = false
      knownIdsRef.current = new Set()
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function poll() {
      if (cancelled) return

      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(poll, intervalMs)
        return
      }

      try {
        const next = await optsRef.current.fetchMessages()
        if (!cancelled && next) {
          if (!primedRef.current) {
            primedRef.current = true
            knownIdsRef.current = new Set(next.map(m => m.id))
            optsRef.current.onMessages(next)
          } else {
            const prevSize = knownIdsRef.current.size
            const newOnes = next.filter(m => !knownIdsRef.current.has(m.id))
            const inbound = newOnes.filter(m => optsRef.current.isInbound(m))
            knownIdsRef.current = new Set(next.map(m => m.id))

            if (newOnes.length > 0 || next.length !== prevSize) {
              optsRef.current.onMessages(next)
            }
            if (inbound.length > 0) {
              optsRef.current.onInbound?.(inbound)
            }
          }
        }
      } catch {
        // Transient network errors — keep the interval alive.
      }

      if (!cancelled) timer = setTimeout(poll, intervalMs)
    }

    // First tick soon so the thread catches up without waiting a full interval;
    // subsequent ticks use intervalMs. First successful fetch only seeds (no toast).
    timer = setTimeout(poll, 1200)

    function onVisibility() {
      if (cancelled || document.hidden) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(poll, 200)
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs])
}
