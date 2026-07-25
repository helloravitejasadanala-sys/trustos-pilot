'use client'

/** Compact “someone is typing…” preview for chat threads. */
export default function TypingPreview({ name }: { name: string }) {
  const label = name.trim() || 'Someone'
  return (
    <div className="vendor-typing" role="status" aria-live="polite">
      <span className="vendor-typing__dots" aria-hidden>
        <i /><i /><i />
      </span>
      <span>{label} is typing…</span>
    </div>
  )
}
