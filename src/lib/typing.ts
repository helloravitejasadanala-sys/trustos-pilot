/**
 * Ephemeral typing presence — in-memory TTL, no schema change.
 *
 * Phase 1 pilot limitation: on serverless, each isolate has its own map,
 * so typing signals work best when both sides hit the same instance.
 * Good enough for a "someone is typing" preview without websockets.
 */

export type TypingRole = 'vendor' | 'client'

type Entry = {
  role: TypingRole
  name: string
  until: number
}

const TTL_MS = 4500
const store = new Map<string, Entry>()

function key(projectId: string, role: TypingRole) {
  return `${projectId}:${role}`
}

export function setTyping(projectId: string, role: TypingRole, name: string) {
  if (!projectId) return
  store.set(key(projectId, role), {
    role,
    name: name.trim() || (role === 'vendor' ? 'Vendor' : 'Client'),
    until: Date.now() + TTL_MS,
  })
}

export function clearTyping(projectId: string, role: TypingRole) {
  store.delete(key(projectId, role))
}

/** Peer typing for the other side of the conversation, or null if stale/absent. */
export function getPeerTyping(projectId: string, viewerRole: TypingRole): { name: string } | null {
  const peer: TypingRole = viewerRole === 'vendor' ? 'client' : 'vendor'
  const entry = store.get(key(projectId, peer))
  if (!entry) return null
  if (entry.until < Date.now()) {
    store.delete(key(projectId, peer))
    return null
  }
  return { name: entry.name }
}
