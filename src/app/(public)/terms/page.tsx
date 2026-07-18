import Link from 'next/link'

export const metadata = { title: 'Pilot terms — TrustOS' }

export default function Page() {
  return (
    <div className="min-h-screen bg-sand-50 text-ink-900">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-ink-500 hover:text-ink-900">← TrustOS</Link>
        <h1 className="text-3xl font-medium mt-6">Pilot terms</h1>
        <p className="mt-4 text-ink-600 leading-relaxed">
          This is a placeholder for the Pilot terms page during the TrustOS pilot.
          Final wording will be reviewed before any real client data is handled.
        </p>
        <p className="mt-4 text-ink-500 text-sm">
          Questions in the meantime? <Link href="/request-demo" className="underline">Get in touch</Link>.
        </p>
      </div>
    </div>
  )
}
