'use client'

import Link from 'next/link'
import { ArrowLeft, KeyRound, Mail } from 'lucide-react'

/**
 * Pilot limitation: no transactional email is configured, so we cannot
 * send a reset link automatically yet. Rather than pretend, we tell the
 * vendor exactly how to get back in. This keeps the flow honest and
 * avoids a dead end.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-paper text-ink-900">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -left-[15%] -top-[10%] h-[60vh] w-[60vh] rounded-full opacity-[0.08] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #d4b8a3 0%, transparent 70%)' }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-ink-200/40 bg-paper/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-display text-lg font-semibold tracking-tight text-forest-800">TrustOS</span>
            <span className="rounded-full border border-forest-200/60 bg-forest-50/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-forest-600">
              Pilot
            </span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-73px)] items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <div className="overflow-hidden rounded-2xl border border-ink-200/40 bg-white/70 p-8 backdrop-blur-sm shadow-soft text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-700">
              <KeyRound size={22} />
            </div>
            <h1 className="font-display text-xl font-semibold text-ink-900 tracking-tight">Reset your password</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              During the pilot, password resets are handled personally so we can
              verify it&apos;s really you. Email us and we&apos;ll send you a new
              password within one business day.
            </p>

            <a
              href="mailto:support@trustos.app?subject=Password%20reset%20request"
              className="btn-primary mt-6 w-full py-3.5 bg-forest-800 hover:bg-forest-900"
            >
              <Mail size={15} className="mr-2" /> Email support
            </a>

            <Link
              href="/login"
              className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm text-ink-400 hover:text-forest-700 transition"
            >
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
