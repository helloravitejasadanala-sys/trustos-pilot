/**
 * Homepage proof / transformation stories.
 * Populate after real tester sessions — never invent quotes.
 * MiniMomentz and Tattva must never appear as customers.
 *
 * While PROOF_STORIES is empty, this section does not render.
 */

export type ProofStory = {
  /** e.g. "How a Coventry makeup artist stopped checking her bank at 11pm." */
  headline: string
  /** One honest sentence — no adjectives, no stars. */
  body: string
  /** Real first name + role only when permissioned. */
  attribution: string
  /** Optional portrait URL when we have consent. */
  photoUrl?: string | null
}

/**
 * Empty until real tester stories exist.
 * Do not invent quotes. When adding stories, never use MiniMomentz or Tattva as customers.
 */
export const PROOF_STORIES: ProofStory[] = []

function isTodo(value: string) {
  return value.trim().toUpperCase().startsWith('TODO')
}

/** True when every required field is real content (not a TODO placeholder). */
export function isProofStoryReady(story: ProofStory): boolean {
  return (
    !!story.headline.trim() &&
    !!story.body.trim() &&
    !!story.attribution.trim() &&
    !isTodo(story.headline) &&
    !isTodo(story.body) &&
    !isTodo(story.attribution)
  )
}

export function ProofSection({ stories = PROOF_STORIES }: { stories?: ProofStory[] }) {
  const ready = stories.filter(isProofStoryReady)
  if (ready.length === 0) return null

  return (
    <section
      className="relative z-10 border-t border-ink-200/30 bg-white/40 px-6 py-20 backdrop-blur-sm md:py-28"
      aria-labelledby="proof-heading"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center md:mb-14">
          <h2
            id="proof-heading"
            className="font-display text-2xl font-semibold text-ink-900 md:text-3xl"
          >
            From people running real bookings
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {ready.map((story, i) => (
            <article
              key={i}
              className="rounded-2xl border border-ink-200/40 bg-white/70 p-5"
            >
              {story.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={story.photoUrl}
                  alt=""
                  className="mb-4 h-14 w-14 rounded-full object-cover"
                />
              ) : null}
              <h3 className="text-[15px] font-semibold leading-snug text-ink-900">
                {story.headline}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">{story.body}</p>
              <p className="mt-4 text-xs font-medium text-ink-500">— {story.attribution}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
