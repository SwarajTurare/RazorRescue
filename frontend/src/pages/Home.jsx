import { useRef } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import KineticBackground from '../components/layout/KineticBackground';

export default function Home() {
  const audioRef = useRef(null);

  return (
    <div className="relative isolate h-[100svh] w-full overflow-hidden bg-[#151517] text-white">
      {/* Animated background */}
      <KineticBackground
        audioRef={audioRef}
        intensity={1.35}
      />

      {/* Foreground content */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col px-5 py-5 md:px-8 md:py-6">
        
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#45B5E7] to-[#B24D9C] shadow-[0_0_30px_rgba(69,181,231,0.18)]">
              <Sparkles size={17} />
            </div>

            <div>
              <div className="font-semibold tracking-tight">
                RazorRescue
              </div>
              <div className="text-[11px] text-white/40">
                AI revenue recovery
              </div>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/75 backdrop-blur-md transition-all duration-300 hover:border-[#45B5E7]/40 hover:bg-[#45B5E7]/10 hover:text-white hover:shadow-[0_0_25px_rgba(69,181,231,0.12)]"
          >
            Open workspace
          </Link>
        </header>

        {/* Hero */}
        <main className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full items-center py-8 sm:py-10 md:py-12">
            <div className="w-full max-w-3xl">

              {/* Eyebrow */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#45B5E7]/20 bg-[#45B5E7]/[0.08] px-3 py-1.5 text-xs text-[#7bd2f7] backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-[#45B5E7] shadow-[0_0_10px_rgba(69,181,231,0.8)]" />
                AI revenue recovery operations
              </div>

              {/* Heading */}
              <h1 className="text-4xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-5xl md:text-6xl lg:text-7xl">
                Find revenue slipping away.
                <br />
                <span className="text-[#D9A353]">
                    Recover it safely.
                </span>
              </h1>

              {/* Description */}
              <p className="mt-5 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7 md:text-lg">
                RazorRescue detects payment failures, chooses bounded recovery
                actions, protects customer trust, and records every outcome
                for finance and compliance teams.
              </p>

              {/* CTA */}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#151517] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_35px_rgba(255,255,255,0.12)]"
                >
                  Enter workspace
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>

                <Link
                  to="/triage"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/80 backdrop-blur-md transition-all duration-300 hover:border-[#B24D9C]/35 hover:bg-[#B24D9C]/10 hover:text-white"
                >
                  Explore AI triage
                </Link>
              </div>

              {/* Features */}
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Feature
                  icon={TrendingUp}
                  title="Measured recovery"
                  text="Batch recovery with real transaction data."
                />

                <Feature
                  icon={ShieldCheck}
                  title="Compliance gates"
                  text="Suppression, quiet hours, and HITL."
                />

                <Feature
                  icon={TimerReset}
                  title="Bounded actions"
                  text="Interventions follow explicit guardrails."
                />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex shrink-0 items-center justify-between border-t border-white/[0.08] py-4 text-[11px] text-white/30">
          <span>Built for real-world fintech operations</span>

          <span className="hidden sm:block">
            React · Node.js · Python · SQLite
          </span>
        </footer>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#45B5E7]/20 hover:bg-white/[0.05]">
      <Icon
        size={17}
        className="text-[#45B5E7]"
      />

      <div className="mt-3 text-sm font-medium">
        {title}
      </div>

      <p className="mt-1 text-xs leading-5 text-white/40">
        {text}
      </p>
    </div>
  );
}