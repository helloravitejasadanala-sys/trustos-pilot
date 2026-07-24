/**
 * Demo allowlist. The /demo endpoints are a PUBLIC, passwordless door,
 * so they must be hard-limited to these two seeded Test projects and
 * nothing else. A real vendor or project can never be reached here.
 */
export const DEMO = {
  minimomentz: {
    vendorEmail: 'ravi@minimomentz.co.uk',
    projectSlug: 'mm-motherhood-demo',
    demoToken: 'demo-minimomentz-motherhood-0000000000000000000000',
    clientEmail: 'sarah.test@minimomentz.demo',
  },
  agaralive: {
    vendorEmail: 'suren@agaralive.co.uk',
    projectSlug: 'agara-stream-demo',
    demoToken: 'demo-agaralive-wedding-000000000000000000000000000',
    clientEmail: 'james.test@agaralive.demo',
  },
} as const

export type DemoKey = keyof typeof DEMO

export function isDemoKey(k: string): k is DemoKey {
  return k === 'minimomentz' || k === 'agaralive'
}

// Every demo vendor email, for a belt-and-braces membership check.
export const DEMO_VENDOR_EMAILS = Object.values(DEMO).map(d => d.vendorEmail)
export const DEMO_PROJECT_SLUGS = Object.values(DEMO).map(d => d.projectSlug)

/**
 * Every seeded demo project slug, including the standalone first-birthday
 * sample that isn't part of the passwordless /demo door. Section C — these
 * are explicitly excluded from real vendor workspace queries so a real
 * pilot user never sees a sample project.
 */
export const ALL_DEMO_PROJECT_SLUGS = [...DEMO_PROJECT_SLUGS, 'demo-first-birthday']

/** Is this signed-in email one of the seeded demo workspaces? */
export function isDemoVendorEmail(email: string | null | undefined): boolean {
  return !!email && DEMO_VENDOR_EMAILS.includes(email.toLowerCase() as any)
}
