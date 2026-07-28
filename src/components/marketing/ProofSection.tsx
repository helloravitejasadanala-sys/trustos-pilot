/**
 * Homepage proof / transformation stories.
 * Populate after real tester sessions — never invent quotes.
 * MiniMomentz and Tattva must never appear as customers.
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
 * Empty scaffolding. Leave headlines as TODO strings so an unfinished
 * homepage cannot look like a vague real testimonial.
 */
export const PROOF_STORIES: ProofStory[] = [
  {
    headline: 'TODO: headline — [business type + city] + [the specific thing that stopped]',
    body: 'TODO: one honest sentence from a real tester (do not invent).',
    attribution: 'TODO: real name',
    photoUrl: null,
  },
  {
    headline: 'TODO: headline — [business type + city] + [the specific thing that stopped]',
    body: 'TODO: one honest sentence from a real tester (do not invent).',
    attribution: 'TODO: real name',
    photoUrl: null,
  },
  {
    headline: 'TODO: headline — [business type + city] + [the specific thing that stopped]',
    body: 'TODO: one honest sentence from a real tester (do not invent).',
    attribution: 'TODO: real name',
    photoUrl: null,
  },
]

function isTodo(value: string) {
  return value.trim().toUpperCase().startsWith('TODO')
}

export function ProofSection({ stories = PROOF_STORIES }: { stories?: ProofStory[] }) {
  return (
    <section
      className="relative z-10 border-t border-ink-200/30 bg-white/40 px-6 py-20 backdrop-blur-sm md:py-28"
      aria-labelledby="proof-heading"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center md:mb-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-clay-600">
            TODO: section label — replace after stories are real
          </p>
          <h2
            id="proof-heading"
            className="mt-2 font-display text-2xl font-semibold text-ink-900 md:text-3xl"
          >
            TODO: proof section title
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            Structure only — populate after this weekend&apos;s tester sessions.
            No invented quotes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stories.map((story, i) => {
            const headlineTodo = isTodo(story.headline)
            const bodyTodo = isTodo(story.body)
            const nameTodo = isTodo(story.attribution)
            return (
              <article
                key={i}
                className={`rounded-2xl border p-5 ${
                  headlineTodo || bodyTodo || nameTodo
                    ? 'border-dashed border-amber-400/70 bg-amber-50/40'
                    : 'border-ink-200/40 bg-white/70'
                }`}
              >
                {story.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={story.photoUrl}
                    alt=""
                    className="mb-4 h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-ink-300/50 bg-ink-50 text-[10px] font-semibold uppercase tracking-wide text-ink-400"
                    aria-hidden
                  >
                    TODO
                  </div>
                )}
                <h3
                  className={`text-[15px] font-semibold leading-snug ${
                    headlineTodo ? 'font-mono text-amber-900' : 'text-ink-900'
                  }`}
                >
                  {story.headline}
                </h3>
                <p
                  className={`mt-3 text-sm leading-relaxed ${
                    bodyTodo ? 'font-mono text-amber-800/90' : 'text-ink-600'
                  }`}
                >
                  {story.body}
                </p>
                <p
                  className={`mt-4 text-xs font-medium ${
                    nameTodo ? 'font-mono text-amber-800' : 'text-ink-500'
                  }`}
                >
                  — {story.attribution}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
