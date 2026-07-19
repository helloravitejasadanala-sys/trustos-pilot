'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { Loader2, ArrowRight, Eye, UserCircle, RotateCcw } from 'lucide-react'

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
      router.push(data.redirect || '/vendor')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
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
      router.push(data.redirect || '/')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function resetDemo(key: string) {
    setBusy(`${key}-reset`)
    try {
      const res = await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not reset')
      toast.success(data.message || 'Reset')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper text-ink-900">
      {/* ===== NOISE TEXTURE OVERLAY ===== */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* ===== WARM AMBIENT ORBS ===== */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -left-[15%] -top-[10%] h-[60vh] w-[60vh] rounded-full opacity-[0.08] blur-[100px]"
          style={{ background: "radial-gradient(circle, #d4b8a3 0%, transparent 70%)" }}
        />
        <div
          className="absolute -right-[5%] top-[25%] h-[45vh] w-[45vh] rounded-full opacity-[0.06] blur-[90px]"
          style={{ background: "radial-gradient(circle, #b9d3c4 0%, transparent 70%)" }}
        />
      </div>

      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-40 border-b border-ink-200/40 bg-paper/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-display text-lg font-semibold tracking-tight text-forest-800">
              TrustOS
            </span>
            <span className="rounded-full border border-forest-200/60 bg-forest-50/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-forest-600">
              Pilot
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-ink-500 transition-colors hover:text-forest-700"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-forest-800 px-4 py-2 text-sm font-medium text-paper-50 shadow-soft transition-all hover:bg-forest-900 hover:shadow-elevated"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="mb-10">
          <h1 className="font-display text-3xl font-semibold text-ink-900 md:text-4xl">
            Sample journeys
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500 max-w-lg">
            Two example projects with fake clients. Open either side — vendor or
            client — and walk the whole journey. Nothing here is real, and you can
            reset any demo to the start.
          </p>
        </div>

        <div className="space-y-5">
          {CARDS.map((c) => (
            <div
              key={c.key}
              className="group relative overflow-hidden rounded-2xl border border-ink-200/40 bg-white/70 p-6 backdrop-blur-sm transition-all duration-300 hover:border-forest-200/60 hover:bg-white hover:shadow-elevated"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-forest-500">
                    {c.vendor}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-ink-900">
                    {c.project}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
                    <span>Client <span className="text-ink-700 font-medium">{c.client}</span></span>
                    <span>Price <span className="text-ink-700 font-medium">{c.price}</span></span>
                    <span>Deposit <span className="text-ink-700 font-medium">{c.deposit}</span></span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openVendor(c.key)}
                    disabled={!!busy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-forest-800 px-4 py-2.5 text-xs font-semibold text-paper-50 shadow-soft transition-all hover:bg-forest-900 hover:shadow-elevated disabled:opacity-40"
                  >
                    {busy === `${c.key}-vendor` ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <UserCircle size={13} />
                    )}
                    Open as Vendor
                  </button>
                  <button
                    onClick={() => openClient(c.key)}
                    disabled={!!busy}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200/60 bg-white/80 px-4 py-2.5 text-xs font-semibold text-ink-700 backdrop-blur-sm transition-all hover:border-forest-300 hover:bg-forest-50/50 hover:text-forest-800 disabled:opacity-40"
                  >
                    {busy === `${c.key}-client` ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Eye size={13} />
                    )}
                    Open as Client
                  </button>
                  <button
                    onClick={() => resetDemo(c.key)}
                    disabled={!!busy}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200/40 px-4 py-2.5 text-xs font-medium text-ink-400 transition-all hover:border-ink-300 hover:text-ink-600 disabled:opacity-40"
                  >
                    {busy === `${c.key}-reset` ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RotateCcw size={13} />
                    )}
                    Reset Demo
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs leading-relaxed text-ink-400 max-w-lg">
          These are demonstration accounts with fake data. Opening as vendor uses a
          temporary demo session — no password is shared. Everything you do is saved,
          so refreshing keeps your place; use <strong>Reset Demo</strong> to start over.
        </p>
      </main>
    </div>
  )
}
