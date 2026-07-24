'use client'

/**
 * Per-device "last seen" tracking for project conversations.
 *
 * Phase 1 has no read/unread column in the database, and we deliberately
 * avoid a schema migration during the pilot. Instead the vendor's browser
 * remembers when it last opened each project's conversation. A project has
 * unread client messages when its latest inbound (client) message is newer
 * than the stored last-seen time. This is per-device by design; noted as a
 * pilot limitation.
 */

const KEY = 'trustos_seen_messages'

type SeenMap = Record<string, string> // projectId -> ISO timestamp

function read(): SeenMap {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '{}') as SeenMap
  } catch {
    return {}
  }
}

/** Mark a project's conversation as seen right now. */
export function markSeen(projectId: string) {
  if (typeof window === 'undefined' || !projectId) return
  const map = read()
  map[projectId] = new Date().toISOString()
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* storage full / unavailable — unread simply won't persist */
  }
}

/** True when the project's latest client message is newer than last seen. */
export function hasUnread(projectId: string, lastClientMessageAt: string | null | undefined): boolean {
  if (!lastClientMessageAt) return false
  const seen = read()[projectId]
  if (!seen) return true
  return new Date(lastClientMessageAt).getTime() > new Date(seen).getTime()
}
