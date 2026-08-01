/**
 * Default agreement text when a vendor sends the agreement.
 * Written as the vendor's agreement with their client — product name
 * must not appear in client-visible text.
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
  const client = (opts.clientName || 'the client').trim() || 'the client'
  const business = opts.businessName.trim() || 'the business'
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

  return `SERVICE AGREEMENT

This agreement is between ${business} and ${client}.

1. Booking
${opts.projectTitle}
Service: ${service}
Date: ${dateLine}
Location: ${locationLine}

2. Fees
Total: £${price.toFixed(2)}
Deposit / advance due to confirm: £${deposit.toFixed(2)}
Balance remaining: £${balance.toFixed(2)}

3. Confirmation
The deposit (or advance) confirms the booking. The balance is due as agreed between ${business} and ${client}.

4. Changes and cancellation
If plans change, contact ${business} as soon as possible. Cancellation or reschedule terms should be agreed in writing (including by message on this booking page).

5. What is included
${business} will deliver the ${service.toLowerCase()} described in the accepted quote. Timelines for files or recordings (if any) will be confirmed by ${business}.

6. Acceptance
By typing their name and confirming on this page, ${client} agrees to these terms for this booking.`
}
