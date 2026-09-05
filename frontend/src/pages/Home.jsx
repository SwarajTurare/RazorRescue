import { useRef } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, TimerReset, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import KineticBackground from '../components/layout/KineticBackground';

export default function Home() {
    const audioRef = useRef(null);
    return <div className="home-page-scrollbar-hidden relative isolate h-[100svh] w-full overflow-hidden bg-rr-bg text-rr-text">
        <KineticBackground audioRef={audioRef} intensity={1.15} />
        <div className="relative z-10 mx-auto flex min-h-full w-full max-w-6xl flex-col px-5 py-5 md:px-8 md:py-6">
            <header className="flex shrink-0 items-center justify-between">
                <Link to="/" className="flex items-center gap-3 rounded-xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-rr-gold">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rr-gold via-[#B87436] to-[#191D2B] shadow-[0_0_28px_rgba(217,163,83,.12)]"><Sparkles size={17} className="text-rr-bg" /></div>
                    <div><div className="font-semibold tracking-tight">RazorRescue</div><div className="text-[11px] text-rr-dim">AI revenue recovery</div></div>
                </Link>
                <Link to="/dashboard" className="rounded-xl border border-rr-border bg-rr-surface/80 px-4 py-2 text-sm text-rr-muted backdrop-blur-md transition hover:border-rr-gold/45 hover:bg-rr-gold/[.04] hover:text-rr-text">Open workspace</Link>
            </header>

            <main className="flex min-h-0 flex-1 items-center py-8 sm:py-10 md:py-12">
                <div className="w-full max-w-4xl">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rr-gold/20 bg-rr-gold/[.05] px-3 py-1.5 text-[11px] uppercase tracking-[.12em] text-rr-gold backdrop-blur-md">
                        <span className="h-1.5 w-1.5 rounded-full bg-rr-gold shadow-[0_0_10px_rgba(217,163,83,.75)]" /> AI revenue recovery operations
                    </div>
                    <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-.045em] text-rr-text sm:text-5xl md:text-6xl lg:text-7xl">
                        Find revenue slipping away.<br />
                        <span
                            className="
    bg-gradient-to-r
    from-[#F0C978]
    via-[#D9A353]
    to-[#A8612F]
    bg-clip-text
    text-transparent
  "
                        >
                            Recover it safely.
                        </span>
                    </h1>
                    <p className="mt-5 max-w-2xl text-sm leading-6 text-rr-muted sm:text-base sm:leading-7 md:text-lg">RazorRescue detects payment failures, diagnoses the cause, chooses bounded recovery actions, protects customer trust, and records the outcome for finance and compliance teams.</p>
                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                        <Link to="/dashboard" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-rr-gold px-5 py-3 text-sm font-semibold text-rr-bg transition hover:-translate-y-0.5 hover:bg-rr-goldBright hover:shadow-[0_10px_35px_rgba(217,163,83,.12)]">Enter workspace <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" /></Link>
                        <Link to="/triage" className="inline-flex items-center justify-center gap-2 rounded-xl border border-rr-border bg-rr-surface/60 px-5 py-3 text-sm font-semibold text-rr-text backdrop-blur-md transition hover:border-rr-gold/40 hover:bg-rr-gold/[.05]">Explore AI triage</Link>
                    </div>
                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                        <Feature icon={TrendingUp} title="Measured recovery" text="Batch recovery with real transaction data." />
                        <Feature icon={ShieldCheck} title="Compliance gates" text="Suppression, quiet hours, and HITL." />
                        <Feature icon={TimerReset} title="Bounded actions" text="Interventions follow explicit guardrails." />
                    </div>
                </div>
            </main>

            <footer className="flex shrink-0 items-center justify-between border-t border-rr-border/60 py-4 text-[10px] text-rr-dim sm:text-[11px]">
                <span>Built for real-world fintech operations</span>
                <span className="hidden sm:block">React · Node.js · Python · SQLite</span>
            </footer>
        </div>
    </div>
}

function Feature({ icon: Icon, title, text }) { return <div className="rr-surface rr-glow rounded-2xl p-4"><Icon size={17} className="text-rr-gold" /><div className="mt-3 text-sm font-medium text-rr-text">{title}</div><p className="mt-1 text-xs leading-5 text-rr-muted">{text}</p></div> }
