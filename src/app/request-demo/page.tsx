'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function RequestDemoPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [business, setBusiness] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    // In production, this would send to your CRM/email
    await new Promise(r => setTimeout(r, 1000))
    toast.success('Thank you. We will be in touch within 24 hours.')
    setEmail('')
    setName('')
    setBusiness('')
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-sm mx-auto px-5 py-10">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-ink-600 transition mb-8">
          <ArrowLeft size={14} />
          Back
        </Link>

        <h1 className="text-xl font-semibold text-ink-900 tracking-tight mb-2">Request a demo</h1>
        <p className="text-sm text-ink-400 mb-8 leading-relaxed">
          We will set up your workspace and walk you through everything.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Your name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ravi Kumar" required className="w-full" />
          </div>
          <div>
            <label className="label">Business name</label>
            <input value={business} onChange={e => setBusiness(e.target.value)} placeholder="e.g. Mini Momentz" required className="w-full" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.com" required className="w-full" />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5 mt-2">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <>
              Request demo <Send size={14} className="ml-2" />
            </>}
          </button>
        </form>

        <p className="text-xs text-ink-300 mt-6 text-center">
          Invitation only. We review every request personally.
        </p>
      </div>
    </div>
  )
}
