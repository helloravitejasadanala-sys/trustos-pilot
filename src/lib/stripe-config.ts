/**
 * Payment configuration + method helpers.
 *
 * Section L — payments must be "safe and honest". The client must never
 * see a Stripe button that leads to a placeholder key, a raw Stripe error
 * or a stack trace. The only way to guarantee that is to detect a *valid*
 * Stripe configuration server-side and hide the Stripe option entirely
 * when it is absent.
 *
 * This module is server-only in spirit (it reads env), but exports pure
 * functions. The secret key itself NEVER leaves the server — callers only
 * ever forward the boolean returned by `isStripeConfigured()`.
 */

/** True only when a real, non-placeholder Stripe secret key is present. */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return false
  // Real Stripe secret keys start with sk_live_ or sk_test_.
  if (!key.startsWith('sk_')) return false
  const lower = key.toLowerCase()
  const placeholders = ['placeholder', 'xxx', 'your_', 'changeme', 'dummy', 'example', 'replace', 'todo']
  if (placeholders.some(p => lower.includes(p))) return false
  // A genuine key is long; reject obviously truncated stubs.
  if (key.length < 24) return false
  return true
}

/**
 * Env + keys gate for server PaymentIntent / webhook plumbing.
 * Does NOT mean the client can pay by card — see isStripePortalPayAvailable.
 */
export function isStripeCheckoutReady(): boolean {
  if (!isStripeConfigured()) return false
  return process.env.STRIPE_CHECKOUT_ENABLED === 'true'
}

/**
 * Real card-pay capability for BOTH vendor quote method selector and client
 * portal. Env/keys alone must never show "Pay securely online" — keep false
 * until Elements (or equivalent) actually works end-to-end on /p/[token].
 */
export function isStripePortalPayAvailable(): boolean {
  return false
}

export type PaymentMethod = 'manual' | 'stripe' | 'free'

/**
 * Normalise any stored/requested method to the three Phase 1 modes.
 * Legacy 'cash' collapses to MANUAL. Unknown/absent defaults to MANUAL,
 * which is the safe mode that never touches Stripe.
 */
export function normalizePaymentMethod(raw: string | null | undefined): PaymentMethod {
  const m = (raw ?? '').toLowerCase().trim()
  if (m === 'free' || m === 'free_collaboration') return 'free'
  if (m === 'stripe') return 'stripe'
  return 'manual'
}

/** Customer-facing label for a payment mode. */
export function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'stripe': return 'Card payment'
    case 'free': return 'No payment required'
    default: return 'Manual payment'
  }
}
