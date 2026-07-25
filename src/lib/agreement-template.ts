/**
 * Default pilot agreement text when a vendor sends the agreement.
 * Keeps the legal step usable without solicitor-reviewed templates.
 */

export function defaultAgreementContent(opts: {
  businessName: string
  clientName?: string | null
  projectTitle: string
  price: number
  deposit: number
  eventDate?: Date | string | null
  location?: string | null
  serviceLabel?: string | null
}) {
  const client = (opts.clientName || 'the Client').trim() || 'the Client'
  const business = opts.businessName.trim() || 'the Provider'
  const dateLine = opts.eventDate
    ? new Date(opts.eventDate).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'To be confirmed'
  const locationLine = (opts.location || '').trim() || 'To be confirmed'
  const service = (opts.serviceLabel || 'services').trim()
  const price = Number.isFinite(opts.price) ? opts.price : 0
  const deposit = Number.isFinite(opts.deposit) ? opts.deposit : 0
  const balance = Math.max(0, price - deposit)

  return `SERVICE AGREEMENT (TrustOS Pilot)

This agreement is between ${business} ("Provider") and ${client} ("Client").

1. Booking
Project: ${opts.projectTitle}
Service: ${service}
Event / appointment date: ${dateLine}
Location: ${locationLine}

2. Fees
Total: £${price.toFixed(2)}
Deposit / advance due to confirm: £${deposit.toFixed(2)}
Balance remaining: £${balance.toFixed(2)}

3. Confirmation
The deposit (or advance) confirms the booking. The balance is due as agreed between Provider and Client.

4. Changes and cancellation
If plans change, contact the Provider as soon as possible. Cancellation or reschedule terms should be agreed in writing (including by message in TrustOS).

5. Deliverables
The Provider will deliver the ${service.toLowerCase()} described in the accepted quote. Timelines for files or recordings (if any) will be confirmed by the Provider.

6. Acceptance
By typing their name and confirming on the secure TrustOS page, the Client agrees to these terms for this booking.

This is a pilot agreement template. Providers should replace it with their own terms when ready.`
}
