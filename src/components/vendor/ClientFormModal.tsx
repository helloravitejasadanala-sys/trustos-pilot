'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useVendorChrome } from '@/components/vendor/VendorShell'

type SavedClient = { id: string; name: string; email: string; phone?: string | null }

export default function ClientFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: { id?: string; name: string; email: string; phone?: string | null }
  onClose: () => void
  onSaved: (client: SavedClient) => void
}) {
  const router = useRouter()
  const { openNewProject } = useVendorChrome()
  const [name, setName] = useState(initial?.name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<SavedClient | null>(null)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSave = name.trim().length > 0 && emailValid
  const isEdit = !!initial?.id

  async function save() {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const url = initial?.id ? `/api/vendor/clients/${initial.id}` : '/api/vendor/clients'
      const res = await fetch(url, {
        method: initial?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      const client: SavedClient = {
        id: data.client.id,
        name: data.client.name,
        email: data.client.email,
        phone: data.client.phone ?? (phone.trim() || null),
      }
      onSaved(client)
      if (isEdit) {
        toast.success('Client updated')
        onClose()
        return
      }
      if (data.reused) {
        toast.success(data.message || 'Using existing client')
      } else {
        toast.success(data.message || 'Client added')
      }
      setCreated(client)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (created) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-float">
          <div className="flex items-center justify-between border-b border-forest-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-forest-950">Client ready</h2>
            <button onClick={onClose} className="rounded-lg p-2 text-forest-500 hover:bg-forest-50" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-4 p-5">
            <p className="text-[14px] text-forest-800" style={{ margin: 0 }}>
              <strong>{created.name}</strong> is in your list. Create a booking next so they get a secure link.
            </p>
            <button
              type="button"
              className="btn btn-forest w-full"
              onClick={() => {
                onClose()
                openNewProject({
                  clientName: created.name,
                  clientEmail: created.email,
                  clientPhone: created.phone,
                })
              }}
            >
              <Plus size={16} className="mr-2" />
              Create booking
            </button>
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => {
                onClose()
                router.push(`/vendor/clients/${created.id}`)
              }}
            >
              View client
            </button>
            <button type="button" className="btn btn-ghost w-full" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-float">
        <div className="flex items-center justify-between border-b border-forest-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-forest-950">{isEdit ? 'Edit client' : 'New client'}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-forest-500 hover:bg-forest-50" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="label">Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" autoFocus />
          </div>
          <div>
            <label className="label">Email <span className="text-red-400">*</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@example.com" />
            {email.length > 0 && !emailValid && <p className="mt-1 text-xs text-red-600">Enter a valid email address</p>}
          </div>
          <div>
            <label className="label">Phone <span className="text-forest-300">(optional)</span></label>
            <input type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07…" />
          </div>
          <button onClick={save} disabled={saving || !canSave} className="btn btn-forest w-full">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} className="mr-2" />{isEdit ? 'Save changes' : 'Create client'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
