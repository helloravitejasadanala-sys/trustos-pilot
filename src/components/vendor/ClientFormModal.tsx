'use client'

import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function ClientFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: { id?: string; name: string; email: string; phone?: string | null }
  onClose: () => void
  onSaved: (client: { id: string; name: string; email: string }) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [saving, setSaving] = useState(false)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSave = name.trim().length > 0 && emailValid

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
      toast.success(initial?.id ? 'Client updated' : 'Client created')
      onSaved(data.client)
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-float">
        <div className="flex items-center justify-between border-b border-forest-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-forest-950">{initial?.id ? 'Edit client' : 'New client'}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-forest-500 hover:bg-forest-50"><X size={18} /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="label">Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Sarah Test" autoFocus />
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
          <button onClick={save} disabled={saving || !canSave} className="btn-primary w-full">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} className="mr-2" />{initial?.id ? 'Save changes' : 'Create client'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
