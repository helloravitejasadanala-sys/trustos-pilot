'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, Loader2, Plus, X, ArrowRight, Link2 } from 'lucide-react'
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
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('FAMILY_SESSION')
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Group types for a tidy dropdown (Photography, Video, Events…).
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
      const { ok, data } = await parseJsonResponse<{ invitation?: { url: string }; error?: string }>(res)
      if (!ok) throw new Error(data.error || 'Failed to create project')
      toast.success('Project created')
      onCreated()
      setCreatedLink(data.invitation?.url ?? null)
    } catch (e: any) {
      toast.error(e.message || 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  async function copyLink() {
    if (!createdLink) return
    try {
      await navigator.clipboard.writeText(createdLink)
      setCopied(true)
      toast.success('Link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — select and copy manually')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-float max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-forest-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-forest-950">
            {createdLink ? 'Project created' : 'New project'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-forest-500 hover:bg-forest-50" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!createdLink ? (
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
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Coventry" />
              </div>
            </div>

            <div className="rounded-xl border border-forest-100 bg-forest-50/40 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-forest-600">Your client</p>
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
        ) : (
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-3 rounded-xl bg-forest-50 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white">
                <Check size={18} />
              </div>
              <p className="text-sm text-forest-800">
                <span className="font-semibold">{title.trim()}</span> is ready. Send your client this secure link — they don&apos;t need an account.
              </p>
            </div>

            <div>
              <label className="label flex items-center gap-1.5"><Link2 size={13} /> Secure client link</label>
              <div className="flex gap-2">
                <input readOnly value={createdLink} className="flex-1 font-mono text-xs" onFocus={e => e.currentTarget.select()} />
                <button onClick={copyLink} className="btn-primary shrink-0 px-4">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-forest-400">
                Next: your client opens the link and confirms their project details.
              </p>
            </div>

            <button onClick={() => { onCreated(); onClose() }} className="btn-primary w-full">
              Done <ArrowRight size={15} className="ml-2" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
