"use client";

import Link from "next/link";
import { Camera, Users, FileText, Truck, Star, ArrowRight, Sparkles } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "Choose a journey template",
    body: "Start from a workflow shaped for your kind of work, or build your own.",
    icon: Sparkles,
  },
  {
    num: "02",
    title: "Add your client",
    body: "Send one secure link. No account, no app for them to learn.",
    icon: Users,
  },
  {
    num: "03",
    title: "Agree scope",
    body: "Questionnaire, proposal and agreement — all in one calm place.",
    icon: FileText,
  },
  {
    num: "04",
    title: "Manage delivery",
    body: "Milestones, approvals and payments move the project forward.",
    icon: Truck,
  },
  {
    num: "05",
    title: "Complete and review",
    body: "Confirm delivery and collect a verified review.",
    icon: Star,
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-paper text-ink-900">
      {/* ===== NOISE TEXTURE OVERLAY (stolen from ve.ai) ===== */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* ===== WARM AMBIENT ORBS (bokeh feel — replaces ve.ai star field) ===== */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -left-[15%] -top-[10%] h-[60vh] w-[60vh] rounded-full opacity-[0.08] blur-[100px]"
          style={{ background: "radial-gradient(circle, #d4b8a3 0%, transparent 70%)" }}
        />
        <div
          className="absolute -right-[5%] top-[25%] h-[45vh] w-[45vh] rounded-full opacity-[0.06] blur-[90px]"
          style={{ background: "radial-gradient(circle, #b9d3c4 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[5%] left-[25%] h-[35vh] w-[35vh] rounded-full opacity-[0.05] blur-[80px]"
          style={{ background: "radial-gradient(circle, #e2cfc0 0%, transparent 70%)" }}
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
              href="/demo"
              className="text-sm font-medium text-ink-500 transition-colors hover:text-forest-700"
            >
              Sample journey
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

      {/* ===== HERO ===== */}
      <section className="relative z-10 px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          {/* Pilot pill */}
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-forest-200/50 bg-forest-50/60 px-4 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-400 opacity-60"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-500"></span>
            </span>
            <span className="text-xs font-medium text-forest-700">
              Pilot open — testing with creative professionals
            </span>
          </div>

          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-clay-600">
            For photographers, planners, DJs and makeup artists
          </p>

          <h1 className="font-display text-[2.75rem] font-semibold leading-[1.1] tracking-tight text-ink-950 md:text-5xl lg:text-[3.5rem]">
            Run every client project from{" "}
            <span className="text-forest-700">one clear workspace</span>.
          </h1>

          <p className="mx-auto mt-7 max-w-lg text-base leading-relaxed text-ink-500 md:text-lg">
            Send one secure link for requirements, agreements, payments,
            milestones and delivery. Your client sees exactly what they need to
            do next — no app to download, no account to create.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-xl bg-forest-800 px-7 py-3.5 text-sm font-semibold text-paper-50 shadow-elevated transition-all hover:bg-forest-900 hover:shadow-float"
            >
              Sign in to your workspace
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-xl border border-ink-200/60 bg-white/80 px-7 py-3.5 text-sm font-semibold text-ink-700 backdrop-blur-sm transition-all hover:border-forest-300 hover:bg-forest-50/50 hover:text-forest-800"
            >
              View sample journey
            </Link>
          </div>

          <p className="mt-6 text-xs text-ink-400">
            No credit card. No commitment. Built for creative businesses.
          </p>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative z-10 border-t border-ink-200/30 bg-white/50 px-6 py-20 backdrop-blur-sm md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="font-display text-2xl font-semibold text-ink-900 md:text-3xl">
              How it works
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Five steps. One calm workspace. No chaos.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((s) => (
              <div
                key={s.num}
                className="group relative rounded-2xl border border-ink-200/40 bg-white/70 p-5 backdrop-blur-sm transition-all duration-300 hover:border-forest-200/60 hover:bg-white hover:shadow-elevated"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-600 transition-colors group-hover:bg-forest-100">
                  <s.icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-forest-500">
                  {s.num}
                </span>
                <h3 className="mt-1 text-sm font-semibold text-ink-800">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== EXAMPLE / STORY ===== */}
      <section className="relative z-10 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-ink-200/40 bg-white/70 backdrop-blur-sm shadow-soft transition-all hover:shadow-elevated">
            <div className="grid md:grid-cols-2">
              {/* Left: visual card */}
              <div className="relative flex min-h-[260px] items-center justify-center bg-forest-950 md:min-h-[340px]">
                <div className="text-center px-8">
                  <Camera className="mx-auto h-10 w-10 text-forest-400/60 mb-4" strokeWidth={1.5} />
                  <p className="font-display text-lg text-paper-100/80">
                    Mini Momentz
                  </p>
                  <p className="mt-1 text-xs text-forest-400/60">
                    One-Year Motherhood Journey
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-forest-700/30 bg-forest-900/40 px-4 py-1.5 text-[11px] text-forest-300/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-forest-500"></span>
                    4 sessions · £2,400 · 1 family
                  </div>
                </div>
                {/* Decorative corner */}
                <div
                  className="absolute bottom-0 right-0 h-28 w-28 bg-forest-800/20"
                  style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
                />
              </div>

              {/* Right: story */}
              <div className="flex flex-col justify-center p-8 md:p-10">
                <span className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-forest-600">
                  One example
                </span>
                <h3 className="font-display text-xl font-semibold text-ink-900 md:text-2xl">
                  A year-long motherhood journey, all in one place
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-500">
                  A family photographer runs maternity, newborn, six months, and
                  first birthday sessions — with every agreement, payment, and
                  milestone tracked in one workspace the family can follow.
                </p>
                <Link
                  href="/demo"
                  className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 transition-colors hover:text-forest-900"
                >
                  Walk through it
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== POSITIONING ===== */}
      <section className="relative z-10 border-t border-ink-200/30 bg-white/30 px-6 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-ink-500">
            No marketplace. No discovery feed.
          </p>
          <p className="mt-1 text-sm text-ink-400">
            You bring your own clients — TrustOS just runs everything after the booking.
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 border-t border-ink-200/30 bg-paper/50 px-6 py-10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold text-ink-600">
              TrustOS
            </span>
            <span className="text-xs text-ink-400">© 2026</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-ink-500">
            <Link href="/privacy" className="transition-colors hover:text-forest-700">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-forest-700">
              Pilot terms
            </Link>
            <Link href="/cookies" className="transition-colors hover:text-forest-700">
              Cookies
            </Link>
            <Link href="/request-demo" className="transition-colors hover:text-forest-700">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
