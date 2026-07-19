import Link from 'next/link'

const YEAR = new Date().getFullYear()

const STEPS = [
  { title: 'Choose a journey template', body: 'Start from a workflow shaped for your kind of work, or build your own.' },
  { title: 'Add your client', body: 'Send one secure link. No account, no app for them to learn.' },
  { title: 'Agree scope', body: 'Questionnaire, proposal and agreement — all in one calm place.' },
  { title: 'Manage delivery', body: 'Milestones, approvals and payments move the project forward.' },
  { title: 'Complete and review', body: 'Confirm delivery and collect a verified review.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper text-forest-950 selection:bg-forest-200/60">
      {/* Nav */}
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="font-display text-xl tracking-tight text-forest-900">TrustOS</span>
        <div className="flex items-center gap-5">
          <Link href="/demo" className="text-sm text-forest-700 hover:text-forest-950 transition">Sample journey</Link>
          <Link href="/login" className="text-sm text-forest-700 hover:text-forest-950 transition">Sign in</Link>
        </div>
      </header>

      {/* Hero — the display serif carries the personality */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24">
        <p className="text-sm text-forest-600 mb-6 tracking-wide">For photographers, planners, DJs and makeup artists</p>
        <h1 className="font-display text-[2.75rem] sm:text-6xl leading-[1.05] tracking-[-0.02em] max-w-3xl text-forest-950">
          Run every client project from one clear workspace.
        </h1>
        <p className="mt-6 text-lg text-forest-700 max-w-xl leading-relaxed">
          Send one secure link for requirements, agreements, payments, milestones and delivery.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/login" className="inline-flex items-center justify-center px-6 py-3 bg-forest-900 text-paper-50 text-sm font-medium rounded-full hover:bg-forest-800 transition">
            Sign in to your workspace
          </Link>
          <Link href="/demo" className="inline-flex items-center justify-center px-6 py-3 border border-forest-300 text-forest-800 text-sm font-medium rounded-full hover:bg-forest-50 transition">
            View sample journey
          </Link>
        </div>
      </section>

      {/* The sequence — numbered because it genuinely is an order */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <div className="border-t border-forest-200 pt-12">
          <h2 className="font-display text-2xl text-forest-900 mb-10">How it works</h2>
          <ol className="grid sm:grid-cols-5 gap-10 sm:gap-6">
            {STEPS.map((s, i) => (
              <li key={i} className="relative">
                <div className="font-display text-3xl text-forest-300 mb-3">{i + 1}</div>
                <h3 className="font-medium text-forest-900 leading-snug">{s.title}</h3>
                <p className="mt-2 text-sm text-forest-600 leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* One honest, concrete example — no invented metrics */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <div className="rounded-3xl bg-forest-950 text-paper-50 p-10 sm:p-14">
          <p className="text-xs uppercase tracking-widest text-forest-300">One example</p>
          <p className="mt-5 font-display text-2xl sm:text-3xl leading-snug max-w-2xl">
            A family photographer runs a year-long motherhood journey — maternity, newborn,
            six months, first birthday — with every session, agreement and payment in one
            place the family can follow.
          </p>
          <Link href="/demo" className="mt-8 inline-flex items-center gap-2 text-sm text-paper-50 border-b border-forest-400 pb-0.5 hover:border-paper-50 transition">
            Walk through it →
          </Link>
        </div>
      </section>

      {/* No marketplace, stated plainly as a value */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <p className="font-display text-xl sm:text-2xl text-forest-800 max-w-2xl leading-snug">
          No marketplace. No discovery feed. You bring your own clients — TrustOS just runs
          everything after the booking.
        </p>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-10 border-t border-forest-200 flex flex-wrap gap-x-6 gap-y-2 text-sm text-forest-500">
        <span>© {YEAR} TrustOS</span>
        <Link href="/privacy" className="hover:text-forest-800">Privacy</Link>
        <Link href="/terms" className="hover:text-forest-800">Pilot terms</Link>
        <Link href="/cookies" className="hover:text-forest-800">Cookies</Link>
        <Link href="/request-demo" className="hover:text-forest-800">Contact</Link>
      </footer>
    </div>
  )
}
