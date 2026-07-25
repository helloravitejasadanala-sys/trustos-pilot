'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { parseJsonResponse } from '@/lib/safe-json'
import {
  defaultProjectTypeForService,
  projectTypesForService,
} from '@/lib/service-profiles'
import { useVendorChrome } from '@/components/vendor/VendorShell'

export default function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const router = useRouter()
  const { primaryService } = useVendorChrome()
  const types = useMemo(() => projectTypesForService(primaryService), [primaryService])
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState(defaultProjectTypeForService(primaryService))
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  useEffect(() => {
    setType(defaultProjectTypeForService(primaryService))
  }, [primaryService])

  const grouped = useMemo(() => {
    const groups: Record<string, typeof types> = {}
    for (const t of types) (groups[t.group] ||= []).push(t)
    return groups
  }, [types])

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())
  const canCreate = title.trim().length > 0 && emailValid

  async function create() {
    if (!canCreate || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/vendor/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type,
          eventDate: eventDate || undefined,
          location: location || undefined,
          clientName: clientName.trim() || undefined,
          clientEmail: clientEmail.trim() || undefined,
          clientPhone: clientPhone.trim() || undefined,
        }),
      })
      const { ok, data } = await parseJsonResponse<{
        project?: { slug: string }
        invitation?: { url: string }
        clientReused?: boolean
        error?: string
      }>(res)
      if (!ok || !data.project?.slug) throw new Error(data.error || 'Failed to create project')
      if (data.clientReused) {
        toast.success('Project created with existing client — copy their secure link next')
      } else if (data.invitation?.url) {
        toast.success('Project created — copy and send the secure client link')
      } else {
        toast.success('Project created — opening it now')
      }
      onCreated()
      onClose()
      router.push(`/vendor/projects/${data.project.slug}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden bg-black/30 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg min-w-0 overflow-x-hidden overflow-y-auto rounded-2xl bg-white shadow-float">
        <div className="flex items-center justify-between gap-3 border-b border-forest-100 px-4 py-3.5 sm:px-5 sm:py-4">
          <h2 className="min-w-0 break-words text-lg font-semibold text-forest-950">New project</h2>
          <button onClick={onClose} className="shrink-0 rounded-lg p-2 text-forest-500 hover:bg-forest-50" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="min-w-0 space-y-4 p-4 sm:p-5">
          <div className="min-w-0">
            <label className="label">Project name <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Priya — First birthday"
              autoFocus
              className="w-full max-w-full"
            />
          </div>

          <div className="min-w-0">
            <label className="label">Project type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full max-w-full">
              {Object.entries(grouped).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="label">Service date</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full max-w-full" />
            </div>
            <div className="min-w-0">
              <label className="label">Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. City or venue" className="w-full max-w-full" />
            </div>
          </div>

          <div className="min-w-0 space-y-4 rounded-xl border border-forest-100 bg-forest-50/40 p-3.5 sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-forest-600">Client</p>
            <p className="text-xs text-forest-500 -mt-2 break-words">
              Email is required so they can message you from their booking page.
            </p>
            <div className="min-w-0">
              <label className="label">Client name</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Priya Sharma" className="w-full max-w-full" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="label">Client email <span className="text-red-400">*</span></label>
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@example.com" className="w-full max-w-full" required />
                {clientEmail.length > 0 && !emailValid && <p className="mt-1 text-xs text-red-600">Enter a valid email address</p>}
              </div>
              <div className="min-w-0">
                <label className="label">Phone <span className="text-forest-300">(optional)</span></label>
                <input type="tel" inputMode="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="07400 123456" className="w-full max-w-full" />
              </div>
            </div>
          </div>

          <button onClick={create} disabled={!canCreate || saving} className="btn-primary w-full">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} className="mr-2" />Create project</>}
          </button>
        </div>
      </div>
    </div>
  )
}
