import { redirect } from 'next/navigation'

/** Analytics are not part of the Phase 1 vendor workspace. */
export default function VendorAnalyticsPage() {
  redirect('/vendor')
}
