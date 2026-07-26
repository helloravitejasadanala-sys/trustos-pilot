/**
 * Vendor project workspace deep-links: /vendor/projects/:slug?tab=<Tab>
 * Any valid tab can be targeted — Chat is just one consumer.
 */

export const VENDOR_WORKSPACE_TABS = [
  'Overview',
  'Money',
  'Prep',
  'Delivery',
  'Chat',
] as const

export type VendorWorkspaceTab = (typeof VENDOR_WORKSPACE_TABS)[number]

const TAB_BY_LOWER = Object.fromEntries(
  VENDOR_WORKSPACE_TABS.map(t => [t.toLowerCase(), t]),
) as Record<string, VendorWorkspaceTab>

/** Parse ?tab= into a canonical tab name, or null if missing/invalid. */
export function parseVendorWorkspaceTab(
  raw: string | null | undefined,
): VendorWorkspaceTab | null {
  if (raw == null || !String(raw).trim()) return null
  return TAB_BY_LOWER[String(raw).trim().toLowerCase()] ?? null
}

/** Build a project workspace href, optionally opening a tab. */
export function vendorProjectHref(
  slug: string,
  tab?: string | null,
): string {
  const base = `/vendor/projects/${slug}`
  const canonical = parseVendorWorkspaceTab(tab ?? null)
  if (!canonical) return base
  return `${base}?tab=${encodeURIComponent(canonical)}`
}

/**
 * Best workspace tab for an ActivityLog event.
 * Unknown events open Overview.
 */
export function tabForActivityEvent(event: string): VendorWorkspaceTab {
  const e = (event || '').toLowerCase()
  if (
    e.includes('payment') ||
    e.includes('deposit') ||
    e.includes('fully_paid') ||
    e.includes('instalment') ||
    e.includes('final_paid') ||
    e.includes('proposal') ||
    e.includes('contract')
  ) {
    return 'Money'
  }
  if (
    e.includes('deliverable') ||
    e.includes('approval') ||
    e.includes('changes_requested') ||
    e.includes('receipt')
  ) {
    return 'Delivery'
  }
  if (e.includes('questionnaire') || e.includes('prep')) {
    return 'Prep'
  }
  if (e.includes('message') || e.includes('chat')) {
    return 'Chat'
  }
  return 'Overview'
}
