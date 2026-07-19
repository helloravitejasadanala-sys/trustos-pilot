'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Check, Loader2, Package, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

type Category = 'PHOTOGRAPHY' | 'LIVE_STREAM' | 'DJ' | 'MAKEUP' | 'EVENT'

interface ChecklistItem {
  name: string
  critical: boolean
}

interface ChecklistTemplate {
  category: string
  items: ChecklistItem[]
}

const EQUIPMENT_TEMPLATES: Record<Category, ChecklistTemplate> = {
  PHOTOGRAPHY: {
    category: 'Photography',
    items: [
      { name: 'Camera bodies (2x)', critical: true },
      { name: 'Lenses (wide, portrait, telephoto)', critical: true },
      { name: 'Batteries (charged, spares)', critical: true },
      { name: 'Memory cards (formatted, spares)', critical: true },
      { name: 'Flashes / speedlights', critical: false },
      { name: 'Lighting stands', critical: false },
      { name: 'Reflectors / diffusers', critical: false },
      { name: 'Props (client shot list)', critical: false },
      { name: 'Weather protection (rain cover)', critical: true },
      { name: 'Client shot list printed', critical: true },
      { name: 'Permissions / permits', critical: true },
    ]
  },
  LIVE_STREAM: {
    category: 'Live Streaming',
    items: [
      { name: 'Cameras (2x minimum)', critical: true },
      { name: 'Tripods', critical: true },
      { name: 'Capture cards', critical: true },
      { name: 'HDMI cables (long + short)', critical: true },
      { name: 'Audio interface + mics', critical: true },
      { name: 'Router + bonded internet', critical: true },
      { name: 'Power backup (UPS)', critical: true },
      { name: 'Extension cables', critical: true },
      { name: 'Stream keys configured', critical: true },
      { name: 'Recording media (backup)', critical: true },
      { name: 'Backup laptop / encoder', critical: false },
    ]
  },
  DJ: {
    category: 'DJ',
    items: [
      { name: 'Controllers / decks', critical: true },
      { name: 'Speakers + stands', critical: true },
      { name: 'Microphones (wireless + wired)', critical: true },
      { name: 'Adapters (XLR, RCA, 3.5mm)', critical: true },
      { name: 'Backup playlist (offline)', critical: true },
      { name: 'Extension cables', critical: true },
      { name: 'Venue sound limit checked', critical: true },
      { name: 'Setup time confirmed', critical: true },
      { name: 'Backup drive with music', critical: false },
    ]
  },
  MAKEUP: {
    category: 'Makeup',
    items: [
      { name: 'Full kit organized', critical: true },
      { name: 'Sanitizers / disposables', critical: true },
      { name: 'Lighting (ring light + backup)', critical: true },
      { name: 'Chair / setup space', critical: false },
      { name: 'Client skin allergy notes', critical: true },
      { name: 'Touch-up kit for event', critical: false },
    ]
  },
  EVENT: {
    category: 'Event',
    items: [
      { name: 'Full equipment list per vendor type', critical: true },
      { name: 'Venue contact number', critical: true },
      { name: 'Parking / loading info', critical: true },
      { name: 'Power requirements confirmed', critical: true },
      { name: 'Backup plan (weather, tech)', critical: true },
    ]
  }
}

export default function EquipmentChecklist({ projectId, projectType }: { projectId: string; projectType: string }) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)

  const category = (projectType as Category) in EQUIPMENT_TEMPLATES ? (projectType as Category) : 'EVENT'
  const template = EQUIPMENT_TEMPLATES[category]

  useEffect(() => {
    const saved = localStorage.getItem(`checklist-${projectId}`)
    if (saved) setChecked(new Set(JSON.parse(saved)))
  }, [projectId])

  const toggle = (name: string) => {
    const next = new Set(checked)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setChecked(next)
    localStorage.setItem(`checklist-${projectId}`, JSON.stringify([...next]))
  }

  const allChecked = template.items.every(i => checked.has(i.name))
  const criticalUnchecked = template.items.filter(i => i.critical && !checked.has(i.name))
  const progress = Math.round((checked.size / template.items.length) * 100)

  if (!expanded) {
    return (
      <div className="mt-6 rounded-2xl border border-ink-200/40 bg-white/70 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-forest-600" />
            <h3 className="text-sm font-semibold text-ink-800">Equipment Checklist</h3>
            {criticalUnchecked.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                <AlertTriangle size={10} />{criticalUnchecked.length} critical
              </span>
            )}
            {allChecked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-semibold text-forest-600">
                <Check size={10} />All ready
              </span>
            )}
          </div>
          <button onClick={() => setExpanded(true)} className="text-xs font-medium text-forest-700 hover:text-forest-900 flex items-center gap-1">
            Expand <ChevronDown size={14} />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
            <div className="h-full bg-forest-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-ink-400">{checked.size}/{template.items.length}</span>
        </div>
        <p className="text-xs text-ink-400 mt-1">{template.category}</p>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-2xl border border-ink-200/40 bg-white/70 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-forest-600" />
          <h3 className="text-sm font-semibold text-ink-800">Equipment Checklist</h3>
        </div>
        <button onClick={() => setExpanded(false)} className="text-xs text-ink-400 hover:text-ink-600 flex items-center gap-1">
          Collapse <ChevronUp size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
          <div className="h-full bg-forest-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-ink-500 font-medium">{progress}%</span>
      </div>

      {criticalUnchecked.length > 0 && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3">
          <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
            <AlertTriangle size={12} />{criticalUnchecked.length} critical item{criticalUnchecked.length > 1 ? 's' : ''} unchecked
          </p>
        </div>
      )}

      <div className="space-y-2">
        {template.items.map((item) => (
          <label
            key={item.name}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
              checked.has(item.name)
                ? 'bg-forest-50/50 border-forest-200/40'
                : item.critical
                ? 'bg-white/50 border-red-200/40'
                : 'bg-white/30 border-ink-100/40'
            }`}
          >
            <div className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
              checked.has(item.name) ? 'bg-forest-500 border-forest-500' : 'border-ink-300'
            }`}>
              {checked.has(item.name) && <Check size={12} className="text-white" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${checked.has(item.name) ? 'text-forest-700 line-through' : 'text-ink-700'}`}>
                {item.name}
              </p>
              {item.critical && !checked.has(item.name) && (
                <p className="text-[10px] text-red-500 mt-0.5 font-medium">Critical — do not forget</p>
              )}
            </div>
            <input type="checkbox" checked={checked.has(item.name)} onChange={() => toggle(item.name)} className="sr-only" />
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-ink-400">{checked.size}/{template.items.length} checked</p>
        {allChecked && (
          <span className="text-xs font-semibold text-forest-600 flex items-center gap-1">
            <Check size={12} /> Ready to go
          </span>
        )}
      </div>
    </div>
  )
}
