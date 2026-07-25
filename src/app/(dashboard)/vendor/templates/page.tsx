'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Plus, BookOpen, FileText, Image as ImageIcon, Copy, Trash2, Loader2, Palette } from 'lucide-react'
import { parseJsonResponse } from '@/lib/safe-json'
import { PageHeader, PageLayout } from '@/components/layout'
import { EmptyState } from '@/components/ui'

type TemplateType = 'CLIENT_KIT' | 'MOOD_BOARD' | 'PLAYBOOK'

interface Template {
  id: string
  type: TemplateType
  name: string
  content: any
  isDefault: boolean
  createdAt: string
}

const typeConfig: Record<TemplateType, { icon: any; label: string; color: string }> = {
  CLIENT_KIT: { icon: BookOpen, label: 'Client Kit', color: 'bg-sage-100 text-sage-700' },
  MOOD_BOARD: { icon: ImageIcon, label: 'Mood Board', color: 'bg-clay-100 text-clay-700' },
  PLAYBOOK: { icon: FileText, label: 'Playbook', color: 'bg-forest-100 text-forest-700' },
}

const defaultContent = (type: TemplateType) =>
  type === 'CLIENT_KIT' ? { sections: [{ title: 'Section 1', body: 'Add your content here…' }] }
  : type === 'MOOD_BOARD' ? { images: [], palette: ['#f5f3ef', '#c7d8c7'] }
  : { steps: [{ time: '09:00', title: 'Step 1', detail: 'Details…' }] }

export default function VendorTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState<TemplateType | 'ALL'>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [newTemplate, setNewTemplate] = useState({ name: '', type: 'CLIENT_KIT' as TemplateType })

  async function fetchTemplates() {
    const res = await fetch('/api/vendor/templates')
    const parsed = await parseJsonResponse<{ templates?: Template[] }>(res)
    if (parsed.ok) setTemplates((parsed.data.templates as Template[]) || [])
    setLoading(false)
  }

  useEffect(() => { fetchTemplates() }, [])

  async function createTemplate() {
    if (!newTemplate.name.trim() || busy) return
    setBusy('create')
    try {
      const res = await fetch('/api/vendor/templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTemplate, name: newTemplate.name.trim(), content: defaultContent(newTemplate.type) }),
      })
      const parsed = await parseJsonResponse<{ error?: string }>(res)
      if (!parsed.ok) throw new Error(parsed.data.error || 'Failed to create')
      toast.success('Template created')
      setShowCreate(false)
      setNewTemplate({ name: '', type: 'CLIENT_KIT' })
      fetchTemplates()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  async function duplicate(t: Template) {
    if (busy) return
    setBusy(t.id)
    try {
      const res = await fetch(`/api/vendor/templates/${t.id}`, { method: 'POST' })
      const parsed = await parseJsonResponse<{ error?: string }>(res)
      if (!parsed.ok) throw new Error(parsed.data.error || 'Failed')
      toast.success('Template duplicated')
      fetchTemplates()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  async function remove(t: Template) {
    if (busy || !confirm(`Delete "${t.name}"?`)) return
    setBusy(t.id)
    try {
      const res = await fetch(`/api/vendor/templates/${t.id}`, { method: 'DELETE' })
      const parsed = await parseJsonResponse<{ error?: string }>(res)
      if (!parsed.ok) throw new Error(parsed.data.error || 'Failed')
      toast.success('Template deleted')
      setTemplates(ts => ts.filter(x => x.id !== t.id))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  const filtered = activeType === 'ALL' ? templates : templates.filter(t => t.type === activeType)

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 size={28} className="animate-spin text-forest-500" />
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Templates"
        description="Reusable client kits, mood boards and playbooks"
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} className="mr-1.5" />New template
          </button>
        }
      />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['ALL', 'CLIENT_KIT', 'MOOD_BOARD', 'PLAYBOOK'] as const).map(type => (
          <button key={type} onClick={() => setActiveType(type)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${activeType === type ? 'bg-forest-950 text-paper-50' : 'bg-white border border-forest-100 text-forest-700'}`}>
            {type === 'ALL' ? 'All' : typeConfig[type].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Palette size={32} />}
          title="No templates yet"
          description="Create your first Client Kit to send preparation guides before every project — then reuse it whenever you like."
          action={
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={16} className="mr-1.5" />Create your first template
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => {
            const config = typeConfig[t.type]
            return (
              <div key={t.id} className="card">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                  <config.icon size={14} />{config.label}
                </span>
                <h3 className="font-semibold text-forest-950 mt-3 mb-1">{t.name}</h3>
                <p className="text-xs text-forest-500 mb-3">
                  {t.isDefault ? 'Default template' : 'Custom'} · {new Date(t.createdAt).toLocaleDateString('en-GB')}
                </p>
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1 text-xs py-1.5" disabled={busy === t.id} onClick={() => duplicate(t)}>
                    <Copy size={14} className="mr-1" />Duplicate
                  </button>
                  <button className="btn-secondary flex-1 text-xs py-1.5 text-red-600 hover:bg-red-50" disabled={busy === t.id} onClick={() => remove(t)}>
                    <Trash2 size={14} className="mr-1" />Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold text-forest-950 mb-4">Create template</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="e.g. Newborn prep guide" className="w-full" autoFocus />
              </div>
              <div>
                <label className="label">Type</label>
                <select value={newTemplate.type} onChange={e => setNewTemplate({ ...newTemplate, type: e.target.value as TemplateType })} className="w-full">
                  <option value="CLIENT_KIT">Client Kit — prep guides & info packs</option>
                  <option value="MOOD_BOARD">Mood Board — inspiration & palettes</option>
                  <option value="PLAYBOOK">Playbook — timelines & run-of-show</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={createTemplate} disabled={!newTemplate.name.trim() || busy === 'create'} className="btn-primary flex-1">
                  {busy === 'create' ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
