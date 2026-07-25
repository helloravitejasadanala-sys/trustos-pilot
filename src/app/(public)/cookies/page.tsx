import Link from 'next/link'

export const metadata = { title: 'Cookies — TrustOS' }

export default function Page() {
  return (
    <div className="min-h-screen bg-sand-50 text-ink-900">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm text-ink-500 hover:text-ink-900">← TrustOS</Link>
        <h1 className="mt-6 text-3xl font-medium">Cookies</h1>
        <p className="mt-2 text-sm text-ink-500">Pilot notice · Last updated 25 July 2026</p>

        <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-ink-600">
          <p>
            TrustOS uses a small number of cookies and similar storage so the product can work.
          </p>
          <p>
            <strong className="font-semibold text-ink-900">Essential.</strong>{' '}
            Signed-in sessions for vendors and admins, and short-lived client portal sessions after
            opening an invite link. Without these, you cannot stay signed in or open your booking page.
          </p>
          <p>
            <strong className="font-semibold text-ink-900">Preference / local.</strong>{' '}
            The browser may keep small local values (for example unread message markers) to make
            Today and Chat clearer. These are not used for advertising.
          </p>
          <p>
            We do not use third-party advertising cookies in the pilot.
          </p>
          <p>
            Questions:{' '}
            <Link href="/request-demo" className="underline underline-offset-2">get in touch</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
