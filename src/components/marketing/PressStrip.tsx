/**
 * Press / “As seen in” logo strip.
 * We have no mentions yet — keep logos empty so the section does not render.
 */

export type PressLogo = {
  name: string
  /** Logo image URL (SVG/PNG). */
  src: string
  href?: string
}

/** Empty until we have a real press mention. Do not invent outlets. */
export const PRESS_LOGOS: PressLogo[] = []

export function PressStrip({ logos = PRESS_LOGOS }: { logos?: PressLogo[] }) {
  if (!logos.length) return null

  return (
    <section
      className="relative z-10 border-t border-ink-200/30 bg-paper/60 px-6 py-12 backdrop-blur-sm"
      aria-label="As seen in"
    >
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
          As seen in
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {logos.map(logo => (
            <li key={logo.name} className="opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0">
              {logo.href ? (
                <a href={logo.href} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo.src} alt={logo.name} className="h-7 w-auto max-w-[140px] object-contain" />
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo.src} alt={logo.name} className="h-7 w-auto max-w-[140px] object-contain" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
