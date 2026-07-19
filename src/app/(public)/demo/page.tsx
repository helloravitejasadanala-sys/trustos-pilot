'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { Loader2, ArrowLeft, Eye, UserCircle, RotateCcw } from 'lucide-react'

/**
 * /demo — the executable sample journeys.
 *
 * Two seeded Test projects. Each card can be opened as the vendor
 * (real vendor session, no password in the browser) or as the client
 * (the real /p/[token] invitation flow), and reset back to the start.
 * All three actions hit hard-scoped endpoints that only ever touch
 * these two demo projects.
 */

type DemoCard = {
  key: 'minimomentz' | 'agaralive'
  vendor: string
  project: string
  client: string
  price: string
  deposit: string
}

const CARDS: DemoCard[] = [
  {
    key: 'minimomentz',
    vendor: 'Mini Momentz',
    project: 'One-Year Motherhood Journey',
    client: 'Sarah Test',
    price: '£2,400',
    deposit: '£400',
  },
  {
    key: 'agaralive',
    vendor: 'Agara Live',
    project: 'Wedding Live Stream',
    client: 'James Test',
    price: '£900',
    deposit: '£200',
  },
]

export default function DemoPage() {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function openVendor(key: string) {
    setBusy(`${key}-vendor`)
    try {
      const res = await fetch('/api/demo/vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not open demo')
      router.push(data.redirect)
    } catch (e: any) {
      toast.error(e.message)
      setBusy(null)
    }
  }

  async function openClient(key: string) {
    setBusy(`${key}-client`)
    try {
      const res = await fetch('/api/demo/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not open demo')
      router.push(data.redirect)
    } catch (e: any) {
      toast.error(e.message)
      setBusy(null)
    }
  }

  async function reset(key: string) {
    setBusy(`${key}-reset`)
    try {
      const res = await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not reset')
      toast.success('Demo reset to the start.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-forest-600 hover:text-forest-950 transition mb-8">
          <ArrowLeft size={15} /> Home
        </Link>

        <h1 className="font-display text-4xl text-forest-950 tracking-tight">Sample journeys</h1>
        <p className="text-forest-700 mt-2 leading-relaxed max-w-xl">
          Two example projects with fake clients. Open either side — vendor or client — and walk
          the whole journey. Nothing here is real, and you can reset any demo to the start.
        </p>

        <div className="mt-8 grid sm:grid-cols-2 gap-5">
          {CARDS.map(card => (
            <div key={card.key} className="border border-forest-200 rounded-2xl bg-white p-5">
              <p className="text-sm text-forest-600">{card.vendor}</p>
              <h2 className="font-display text-xl text-forest-950 mt-0.5">{card.project}</h2>

              <dl className="mt-4 space-y-1.5 text-sm">
                <Row k="Client" v={card.client} />
                <Row k="Price" v={card.price} />
                <Row k="Deposit" v={card.deposit} />
              </dl>

              <div className="mt-5 space-y-2">
                <button
                  onClick={() => openVendor(card.key)}
                  disabled={!!busy}
                  className="w-full flex items-center justify-center gap-2 bg-forest-900 text-paper-50 text-sm font-medium rounded-full py-3 min-h-[44px] hover:bg-forest-800 transition disabled:opacity-40"
                >
                  {busy === `${card.key}-vendor` ? <Loader2 size={15} className="animate-spin" /> : <UserCircle size={16} />}
                  Open as Vendor
                </button>
                <button
                  onClick={() => openClient(card.key)}
                  disabled={!!busy}
                  className="w-full flex items-center justify-center gap-2 border border-forest-300 text-forest-800 text-sm font-medium rounded-xl py-3 min-h-[44px] hover:bg-forest-50 transition disabled:opacity-40"
                >
                  {busy === `${card.key}-client` ? <Loader2 size={15} className="animate-spin" /> : <Eye size={16} />}
                  Open as Client
                </button>
                <button
                  onClick={() => reset(card.key)}
                  disabled={!!busy}
                  className="w-full flex items-center justify-center gap-2 text-forest-600 text-sm rounded-xl py-2.5 min-h-[44px] hover:text-forest-800 transition disabled:opacity-40"
                >
                  {busy === `${card.key}-reset` ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={14} />}
                  Reset Demo
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-forest-500 leading-relaxed">
          These are demonstration accounts with fake data. Opening as vendor uses a temporary
          demo session — no password is shared. Everything you do is saved, so refreshing keeps
          your place; use Reset Demo to start over.
        </p>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-forest-600">{k}</dt>
      <dd className="text-forest-950">{v}</dd>
    </div>
  )
}
