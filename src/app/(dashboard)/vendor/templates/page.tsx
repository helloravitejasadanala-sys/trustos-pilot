import { redirect } from 'next/navigation'

/** Templates are not part of the Phase 1 vendor workspace. */
export default function VendorTemplatesPage() {
  redirect('/vendor')
}
