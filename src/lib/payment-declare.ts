/**
 * Client-declared payment methods (manual-first).
 * Stored on Payment.method while status is PENDING — vendor confirms separately.
 */

export const DECLARED_PAYMENT_METHODS = [
  'bank_transfer',
  'cash',
  'card_in_person',
] as const

export type DeclaredPaymentMethod = (typeof DECLARED_PAYMENT_METHODS)[number]

export function isDeclaredPaymentMethod(raw: unknown): raw is DeclaredPaymentMethod {
  return typeof raw === 'string' && (DECLARED_PAYMENT_METHODS as readonly string[]).includes(raw)
}

export function declaredPaymentMethodLabel(method: string | null | undefined): string {
  switch ((method || '').toLowerCase()) {
    case 'bank_transfer':
      return 'bank transfer'
    case 'cash':
      return 'cash'
    case 'card_in_person':
      return 'card in person'
    case 'manual':
      return 'manual payment'
    case 'stripe':
      return 'card (online)'
    default:
      return method?.trim() || 'another way'
  }
}

export const DECLARED_PAYMENT_OPTIONS: { value: DeclaredPaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer / online transfer' },
  { value: 'cash', label: 'Cash / by hand' },
  { value: 'card_in_person', label: 'Card in person' },
]
