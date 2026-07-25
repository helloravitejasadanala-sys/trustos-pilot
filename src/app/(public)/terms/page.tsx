import Link from 'next/link'

export const metadata = { title: 'Pilot terms — TrustOS' }

export default function Page() {
  return (
    <div className="min-h-screen bg-sand-50 text-ink-900">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm text-ink-500 hover:text-ink-900">← TrustOS</Link>
        <h1 className="mt-6 text-3xl font-medium">Pilot terms</h1>
        <p className="mt-2 text-sm text-ink-500">Pilot notice · Last updated 25 July 2026</p>

        <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-ink-600">
          <p>
            These terms cover use of TrustOS during the pilot. The product is provided for evaluation
            and early daily use by invited businesses.
          </p>
          <p>
            <strong className="font-semibold text-ink-900">Your responsibilities.</strong>{' '}
            Keep login details secure. Enter accurate client and booking information.
            Only invite people who should see a booking. You remain responsible for your contracts,
            pricing, and service delivery with your clients.
          </p>
          <p>
            <strong className="font-semibold text-ink-900">The service.</strong>{' '}
            TrustOS helps organise invites, details, quotes, agreements, messages, and delivery links.
            Features may change during the pilot. Availability is not guaranteed without interruption.
          </p>
          <p>
            <strong className="font-semibold text-ink-900">Payments.</strong>{' '}
            Where bank transfer or other offline payment is used, TrustOS records status you confirm —
            it does not move money unless a separate checkout integration is enabled for your workspace.
          </p>
          <p>
            <strong className="font-semibold text-ink-900">Acceptable use.</strong>{' '}
            Do not misuse the service, attempt unauthorised access, or upload unlawful content.
            We may suspend access that puts the pilot or other users at risk.
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
