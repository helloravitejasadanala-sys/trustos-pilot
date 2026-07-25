import Link from 'next/link'

export const metadata = { title: 'Privacy — TrustOS' }

export default function Page() {
  return (
    <div className="min-h-screen bg-sand-50 text-ink-900">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm text-ink-500 hover:text-ink-900">← TrustOS</Link>
        <h1 className="mt-6 text-3xl font-medium">Privacy</h1>
        <p className="mt-2 text-sm text-ink-500">Pilot notice · Last updated 25 July 2026</p>

        <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-ink-600">
          <p>
            TrustOS is a pilot product for event service businesses and their clients.
            We only collect what is needed to run bookings, messages, quotes, agreements, and payments confirmation.
          </p>
          <p>
            <strong className="font-semibold text-ink-900">What we store.</strong>{' '}
            Account details for vendors and admins (name, email, password hash), business profile information,
            client contact details you enter, project and event details, messages, files links you add,
            and basic activity needed to operate the service.
          </p>
          <p>
            <strong className="font-semibold text-ink-900">How we use it.</strong>{' '}
            To provide the product, keep sessions secure, show the right project to the right person,
            and improve the pilot with internal operations tools. We do not sell personal data.
          </p>
          <p>
            <strong className="font-semibold text-ink-900">Who can see it.</strong>{' '}
            Vendors see their own clients and projects. Clients see only the booking they were invited to.
            TrustOS staff may access accounts for support and pilot operations.
          </p>
          <p>
            <strong className="font-semibold text-ink-900">Retention.</strong>{' '}
            Pilot data is kept while the pilot is active and for a short period after if needed for support or legal reasons.
            You can ask us to correct or delete account data where practical.
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
