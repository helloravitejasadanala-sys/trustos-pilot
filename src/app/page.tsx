'use client';

import Link from "next/link";
import { Users, FileText, Truck, Star, ArrowRight, Briefcase, MapPin } from "lucide-react";
import { ProofSection } from "@/components/marketing/ProofSection";

const steps = [
  {
    num: "01",
    title: "Create a booking",
    body: "Add the job and your client in under a minute.",
    icon: Briefcase,
  },
  {
    num: "02",
    title: "Share one link",
    body: "Your client opens a secure link — no app, no account.",
    icon: Users,
  },
  {
    num: "03",
    title: "Agree the work",
    body: "Details, quote and agreement in one place.",
    icon: FileText,
  },
  {
    num: "04",
    title: "Payment recorded & delivered",
    body: "Your client declares payment; you confirm. No card fees — we never touch your money.",
    icon: Truck,
  },
  {
    num: "05",
    title: "Finish cleanly",
    body: "Confirm delivery and collect a review.",
    icon: Star,
  },
  {
    num: "06",
    title: "Learn the venue",
    body: "Every completed job saves what you learned about that venue — and it surfaces automatically next time you're booked there.",
    icon: MapPin,
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-paper text-ink-900">
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

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
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/login"
              className="text-sm font-medium text-ink-500 transition-colors hover:text-forest-700"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-forest-800 px-4 py-2 text-sm font-medium text-paper-50 shadow-soft transition-all hover:bg-forest-900 hover:shadow-elevated"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-forest-200/50 bg-forest-50/60 px-4 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-400 opacity-60"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-500"></span>
            </span>
            <span className="text-xs font-medium text-forest-700">
              For photographers, editors, livestream, makeup &amp; DJs
            </span>
          </div>

          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-clay-600">
            Made for creative businesses — not tech teams
          </p>

          <h1 className="font-display text-[2.75rem] font-semibold leading-[1.1] tracking-tight text-ink-950 md:text-5xl lg:text-[3.5rem]">
            One booking. One link.{" "}
            <span className="text-forest-700">Less chasing on WhatsApp.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-lg text-base leading-relaxed text-ink-500 md:text-lg">
            Details, quote, agreement, payment and delivery stay on one secure
            client page — so everyone always knows what happens next.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-forest-800 px-7 py-3.5 text-sm font-semibold text-paper-50 shadow-elevated transition-all hover:bg-forest-900 hover:shadow-float"
            >
              Sign up — create your workspace
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-ink-500 underline-offset-4 hover:text-forest-700 hover:underline"
            >
              Already have a workspace? Sign in
            </Link>
          </div>

          <p className="mt-6 text-sm text-ink-400">
            First step: Sign up · Then sign in anytime · No card · Cancel anytime in the pilot
          </p>
        </div>
      </section>

      <section className="relative z-10 border-t border-ink-200/30 bg-white/50 px-6 py-20 backdrop-blur-sm md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="font-display text-2xl font-semibold text-ink-900 md:text-3xl">
              How it works
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Six steps. One workspace.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Empty until PROOF_STORIES has real quotes — renders nothing today. */}
      <ProofSection />

      <section className="relative z-10 border-t border-ink-200/30 bg-white/30 px-6 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-ink-500">
            You bring the clients. TrustOS runs the job after booking.
          </p>
          <p className="mt-1 text-sm text-ink-400">
            Photography, editing, live streaming, makeup and DJ — same calm booking flow.
          </p>
          <ul className="mx-auto mt-8 max-w-md space-y-2 text-left text-sm text-ink-500">
            <li>✓ No card to start the pilot</li>
            <li>✓ Your client never needs an account</li>
            <li>✓ Built for WhatsApp-and-notebook businesses — not tech teams</li>
          </ul>
        </div>
      </section>

      <footer className="relative z-10 border-t border-ink-200/30 bg-paper/50 px-6 py-10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold text-ink-600">
              TrustOS
            </span>
            <span className="text-sm text-ink-400">© 2026</span>
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
            <Link href="/feedback" className="transition-colors hover:text-forest-700">
              Feedback
            </Link>
            <Link href="/research/venue" className="transition-colors hover:text-forest-700">
              Venue research
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
