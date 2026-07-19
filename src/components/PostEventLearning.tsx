'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Star, Loader2, Send, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface Question {
  id: string
  label: string
  placeholder: string
  type: 'textarea' | 'text' | 'rating'
}

const QUESTIONS: Question[] = [
  { id: 'wentWell', label: 'What went well?', placeholder: 'The lighting was perfect, the client was prepared...', type: 'textarea' },
  { id: 'problems', label: 'What problem occurred?', placeholder: 'Backup battery died, venue had no power near stage...', type: 'textarea' },
  { id: 'solution', label: 'How was it solved?', placeholder: 'Used portable power bank, asked venue for extension...', type: 'textarea' },
  { id: 'missing', label: 'What equipment was missing?', placeholder: 'Longer HDMI cable, second mic stand...', type: 'textarea' },
  { id: 'venueAccurate', label: 'Was the venue information accurate?', placeholder: 'Parking was harder than expected, loading dock was closed...', type: 'textarea' },
  { id: 'advice', label: 'What should another vendor know?', placeholder: 'Arrive 30 min early for parking, bring your own extension...', type: 'textarea' },
  { id: 'setupTime', label: 'How long did setup take?', placeholder: '45 minutes', type: 'text' },
  { id: 'clientJourney', label: 'Was the client journey effective?', placeholder: 'Yes, the questionnaire helped us prepare...', type: 'textarea' },
  { id: 'rating', label: 'Overall experience (1-5)', placeholder: '', type: 'rating' },
]

export default function PostEventLearning({ projectId, onSubmit }: { projectId: string; onSubmit: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleSubmit = async () => {
    if (Object.keys(answers).length < 3) {
      toast.error('Please answer at least 3 questions')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/vendor/projects/${projectId}/learning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Learning saved — thank you for contributing')
      setSubmitted(true)
      onSubmit()
    } catch {
      toast.error('Could not save — try again')
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 rounded-2xl border border-forest-200/40 bg-forest-50/50 p-6 backdrop-blur-sm text-center">
        <CheckCircle size={32} className="mx-auto text-forest-500 mb-3" />
        <h3 className="font-display text-lg font-semibold text-forest-800">Thank you</h3>
        <p className="text-sm text-forest-600 mt-1">Your experience will help other vendors prepare better.</p>
      </div>
    )
  }

  if (!expanded) {
    return (
      <div className="mt-6 rounded-2xl border border-ink-200/40 bg-white/70 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-forest-600" />
            <h3 className="text-sm font-semibold text-ink-800">Post-Event Learning</h3>
          </div>
          <button onClick={() => setExpanded(true)} className="text-xs font-medium text-forest-700 hover:text-forest-900 flex items-center gap-1">
            Share experience <ChevronDown size={14} />
          </button>
        </div>
        <p className="text-xs text-ink-400 mt-1">Help future vendors learn from your experience</p>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-2xl border border-ink-200/40 bg-white/70 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-forest-600" />
          <h3 className="text-sm font-semibold text-ink-800">Post-Event Learning</h3>
        </div>
        <button onClick={() => setExpanded(false)} className="text-xs text-ink-400 hover:text-ink-600 flex items-center gap-1">
          Collapse <ChevronUp size={14} />
        </button>
      </div>
      <p className="text-xs text-ink-400 mb-5">Share what you learned so future vendors benefit from your experience.</p>

      <div className="space-y-4">
        {QUESTIONS.map((q) => (
          <div key={q.id}>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">{q.label}</label>
            {q.type === 'textarea' ? (
              <textarea
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.placeholder}
                rows={2}
                className="w-full rounded-xl border border-ink-200/50 bg-white/80 px-3.5 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:border-forest-300 focus:ring-0 focus:outline-none resize-none transition-colors"
              />
            ) : q.type === 'rating' ? (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: String(star) }))}
                    className={`h-10 w-10 rounded-xl border flex items-center justify-center text-sm font-semibold transition-all ${
                      Number(answers[q.id]) >= star
                        ? 'bg-forest-50 border-forest-300 text-forest-700'
                        : 'bg-white/50 border-ink-200/40 text-ink-400 hover:border-ink-300'
                    }`}
                  >
                    {star}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.placeholder}
                className="w-full rounded-xl border border-ink-200/50 bg-white/80 px-3.5 py-2.5 text-sm text-ink-800 placeholder:text-ink-300 focus:border-forest-300 focus:ring-0 focus:outline-none transition-colors"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || Object.keys(answers).length < 3}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-forest-800 px-5 py-2.5 text-sm font-semibold text-paper-50 shadow-soft transition-all hover:bg-forest-900 hover:shadow-elevated disabled:opacity-40"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        Save learning
      </button>
      <p className="text-xs text-ink-400 mt-2">Answer at least 3 questions to submit</p>
    </div>
  )
}
