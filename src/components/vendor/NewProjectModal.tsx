'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { PROJECT_TYPES } from '@/lib/project-types'
import { parseJsonResponse } from '@/lib/safe-json'

export default function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('FAMILY_SESSION')
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  const grouped = useMemo(() => {
    const groups: Record<string, typeof PROJECT_TYPES> = {}
    for (const t of PROJECT_TYPES) (groups[t.group] ||= []).push(t)
    return groups
  }, [])

  const emailValid = clientEmail.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())
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
        error?: string
      }>(res)
      if (!ok || !data.project?.slug) throw new Error(data.error || 'Failed to create project')
      toast.success('Project created — opening it now')
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-float max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-forest-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-forest-950">New project</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-forest-500 hover:bg-forest-50" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="label">Project name <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Priya — First birthday"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Project type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full">
              {Object.entries(grouped).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Event date</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. City or venue" />
            </div>
          </div>

          <div className="rounded-xl border border-forest-100 bg-forest-50/40 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-forest-600">Your client</p>
            <p className="text-xs text-forest-500 -mt-2">
              Add a name and email so this project also appears under Clients after you create it.
            </p>
            <div>
              <label className="label">Client name</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Priya Sharma" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Client email</label>
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@example.com" />
                {clientEmail.length > 0 && !emailValid && <p className="mt-1 text-xs text-red-600">Enter a valid email address</p>}
              </div>
              <div>
                <label className="label">Phone <span className="text-forest-300">(optional)</span></label>
                <input type="tel" inputMode="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="07400 123456" />
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
