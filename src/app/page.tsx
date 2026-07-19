import Link from 'next/link'

const YEAR = new Date().getFullYear()

const STEPS = [
  { n: '1', title: 'Choose a Journey Template', body: 'Start from a workflow shaped for your kind of work, or build your own.' },
  { n: '2', title: 'Add your client', body: 'Send one secure link. No account, no app for them to learn.' },
  { n: '3', title: 'Agree scope', body: 'Questionnaire, proposal and agreement — all in one calm place.' },
  { n: '4', title: 'Manage delivery', body: 'Milestones, approvals and payments move the project forward.' },
  { n: '5', title: 'Complete and review', body: 'Confirm delivery and collect a verified review.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-sand-50 text-ink-900">
      {/* Nav */}
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="font-medium tracking-tight">TrustOS</span>
        <Link href="/login" className="text-sm text-ink-600 hover:text-ink-900 transition">Sign in</Link>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20">
        <h1 className="text-4xl sm:text-5xl font-medium tracking-tight leading-[1.1] max-w-2xl">
          Run every client project from one clear workspace.
        </h1>
        <p className="mt-5 text-lg text-ink-600 max-w-xl leading-relaxed">
          Send one secure link for requirements, agreements, payments, milestones and delivery.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="inline-flex items-center justify-center px-5 py-3 bg-ink-900 text-white text-sm font-medium rounded-xl hover:bg-ink-800 transition">
            Sign in to your workspace
          </Link>
          <Link href="/demo" className="inline-flex items-center justify-center px-5 py-3 border border-ink-300 text-ink-800 text-sm font-medium rounded-xl hover:bg-ink-50 transition">
            View sample journey
          </Link>
        </div>
      </section>

      {/* Five steps — a real sequence, so numbering earns its place */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="border-t border-ink-200 pt-10">
          <ol className="grid sm:grid-cols-5 gap-8 sm:gap-5">
            {STEPS.map(s => (
              <li key={s.n}>
                <div className="text-xs font-mono text-ink-400">{s.n}</div>
                <h3 className="mt-2 font-medium text-ink-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-ink-500 leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* One honest example — no metrics, no claims */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="border border-ink-200 rounded-2xl bg-white p-8">
          <p className="text-xs uppercase tracking-wide text-ink-400">One example</p>
          <p className="mt-3 text-lg text-ink-800 max-w-xl leading-relaxed">
            A family photographer runs a year-long Motherhood Journey — maternity, newborn,
            six months, first birthday — with each session, agreement and payment tracked in
            one place the family can follow.
          </p>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-10 border-t border-ink-200 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-400">
        <span>© {YEAR} TrustOS</span>
        <Link href="/privacy" className="hover:text-ink-600">Privacy</Link>
        <Link href="/terms" className="hover:text-ink-600">Pilot terms</Link>
        <Link href="/cookies" className="hover:text-ink-600">Cookies</Link>
        <Link href="/request-demo" className="hover:text-ink-600">Contact</Link>
      </footer>
    </div>
  )
}
