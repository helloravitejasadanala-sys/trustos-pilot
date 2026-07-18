'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  LayoutDashboard, Briefcase, Package, Palette, BarChart3, 
  LogOut, Plus, BookOpen, FileText, Image, MoreVertical, 
  Copy, Trash2, Loader2, ChevronRight 
} from 'lucide-react'
import Link from 'next/link'

type TemplateType = 'CLIENT_KIT' | 'MOOD_BOARD' | 'PLAYBOOK'

interface Template {
  id: string
  type: TemplateType
  name: string
  content: any
  isDefault: boolean
  createdAt: string
}

const typeConfig = {
  CLIENT_KIT: { icon: BookOpen, label: 'Client Kit', color: 'bg-sage-100 text-sage-700', border: 'border-sage-200' },
  MOOD_BOARD: { icon: Image, label: 'Mood Board', color: 'bg-clay-100 text-clay-700', border: 'border-clay-200' },
  PLAYBOOK: { icon: FileText, label: 'Playbook', color: 'bg-ink-100 text-ink-700', border: 'border-ink-200' },
}

export default function VendorTemplatesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState<TemplateType | 'ALL'>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ name: '', type: 'CLIENT_KIT' as TemplateType })

  useEffect(() => {
    fetchUser()
    fetchTemplates()
  }, [])

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (!data.user || data.user.role !== 'VENDOR') {
        router.push('/login')
        return
      }
      setUser(data.user)
    } catch {
      router.push('/login')
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/vendor/templates')
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch {
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  async function createTemplate() {
    try {
      const res = await fetch('/api/vendor/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTemplate,
          content: newTemplate.type === 'CLIENT_KIT' 
            ? { sections: [{ title: 'Section 1', body: 'Add your content here...' }] }
            : newTemplate.type === 'MOOD_BOARD'
            ? { images: [], palette: ['#f5f3ef', '#c7d8c7'] }
            : { steps: [{ time: '09:00', title: 'Step 1', detail: 'Details...' }] }
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      toast.success('Template created!')
      setShowCreate(false)
      setNewTemplate({ name: '', type: 'CLIENT_KIT' })
      fetchTemplates()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const filtered = activeType === 'ALL' 
    ? templates 
    : templates.filter(t => t.type === activeType)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-ink-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-sand-200 hidden lg:flex flex-col">
        <div className="p-5 border-b border-sand-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-card bg-ink-900 text-white flex items-center justify-center">
              <LayoutDashboard size={16} />
            </div>
            <span className="font-semibold text-ink-900">TrustOS</span>
          </div>
          <p className="text-xs text-ink-400 mt-1">{user?.vendorProfile?.businessName || 'Vendor'}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link href="/vendor" className="flex items-center gap-2 px-3 py-2 rounded-card text-sm font-medium text-ink-600 hover:bg-sand-50">
            <Briefcase size={16} /> Projects
          </Link>
          <Link href="/vendor/templates" className="flex items-center gap-2 px-3 py-2 rounded-card text-sm font-medium bg-sand-100 text-ink-900">
            <Palette size={16} /> Templates
          </Link>
          <Link href="/vendor/analytics" className="flex items-center gap-2 px-3 py-2 rounded-card text-sm font-medium text-ink-600 hover:bg-sand-50">
            <BarChart3 size={16} /> Analytics
          </Link>
        </nav>
        <div className="p-3 border-t border-sand-200">
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-card text-sm text-ink-500 hover:bg-sand-50 w-full">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden bg-white border-b border-sand-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink-900">Templates</span>
          <button onClick={logout} className="text-sm text-ink-500">Sign Out</button>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:ml-64 p-4 sm:p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-ink-900">Templates</h1>
            <p className="text-sm text-ink-500">Client Kits, Mood Boards & Playbooks</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} className="mr-1" />
            New Template
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['ALL', 'CLIENT_KIT', 'MOOD_BOARD', 'PLAYBOOK'] as const).map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-1.5 rounded-chip text-sm font-medium transition whitespace-nowrap ${
                activeType === type 
                  ? 'bg-ink-900 text-white' 
                  : 'bg-white text-ink-600 hover:bg-sand-50 border border-sand-200'
              }`}
            >
              {type === 'ALL' ? 'All' : typeConfig[type].label}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 && (
            <div className="card text-center py-12 col-span-full">
              <Palette size={32} className="mx-auto text-ink-300 mb-3" />
              <p className="text-ink-500">No templates yet. Create your first one!</p>
            </div>
          )}
          {filtered.map(template => {
            const config = typeConfig[template.type]
            return (
              <div key={template.id} className="card group hover:shadow-elevated transition">
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-chip text-xs font-medium ${config.color}`}>
                    <config.icon size={14} />
                    {config.label}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-ink-600 transition">
                    <MoreVertical size={16} />
                  </button>
                </div>
                <h3 className="font-semibold text-ink-900 mb-1">{template.name}</h3>
                <p className="text-xs text-ink-500 mb-3">
                  {template.isDefault ? 'Default template' : 'Custom'} • {new Date(template.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1 text-xs py-1.5">
                    <Copy size={14} className="mr-1" />
                    Duplicate
                  </button>
                  <button className="btn-secondary flex-1 text-xs py-1.5 text-clay-600 hover:bg-clay-50">
                    <Trash2 size={14} className="mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold text-ink-900 mb-4">Create Template</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  value={newTemplate.name}
                  onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Newborn Prep Guide"
                  className="w-full"
                />
              </div>
              <div>
                <label className="label">Type</label>
                <select
                  value={newTemplate.type}
                  onChange={e => setNewTemplate({ ...newTemplate, type: e.target.value as TemplateType })}
                  className="w-full"
                >
                  <option value="CLIENT_KIT">Client Kit — Prep guides & info packs</option>
                  <option value="MOOD_BOARD">Mood Board — Visual inspiration & palettes</option>
                  <option value="PLAYBOOK">Playbook — Timelines & run-of-show</option>
                </select>
              </div>
              <div className="p-3 rounded-card bg-sand-50 text-xs text-ink-500">
                <p><strong>Client Kit:</strong> Share prep guides, what-to-bring lists, and FAQs with clients.</p>
                <p className="mt-1"><strong>Mood Board:</strong> Curate visual inspiration, colour palettes, and styling references.</p>
                <p className="mt-1"><strong>Playbook:</strong> Create detailed timelines and run-of-show documents for events.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={createTemplate} disabled={!newTemplate.name} className="btn-primary flex-1">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
