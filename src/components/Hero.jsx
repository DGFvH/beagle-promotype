import {
  BookOpen,
  PlayCircle,
  Plug,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Users,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { LogoMark } from "./Logo.jsx";
import HeroEvolutionVisual from "./HeroEvolutionVisual.jsx";

const LOOP = ["Test", "Measure", "Decide", "Evolve"];

const PILLARS = [
  { icon: Sparkles, label: "Claude proposes the variant" },
  { icon: ShieldCheck, label: "Respects your design system & guardrails" },
  { icon: BarChart3, label: "Real GA4 results, read back live" },
  { icon: Users, label: "Per-segment breakdown" },
  { icon: CheckCircle2, label: "Human-approved — nothing ships unseen" },
];

export default function Hero({ onStart, onMethodology, onConfigure }) {
  return (
    <section className="hero-stage flex w-full flex-col justify-center overflow-hidden py-6 sm:py-10">
      <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
        {/* ── Left column: copy + CTAs + trust row ─────────────────────────── */}
        <div className="relative z-10 min-w-0">
          <div className="animate-pop hero-stagger-1 flex flex-wrap items-center gap-3">
            <span className="glass inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-sm font-semibold tracking-tight text-ink shadow-sm">
              <LogoMark size={18} />
              beagle
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-2.5 py-1 text-[12px] font-medium text-accent">
              <Sparkles size={13} aria-hidden />
              Powered by Claude
            </span>
          </div>

          <h1 className="animate-pop hero-stagger-1 mt-7 text-balance font-serif text-[2.6rem] font-medium leading-[1.03] tracking-[-0.018em] text-ink sm:text-[3.6rem] lg:text-[4rem]">
            Let Claude turn your hero section into a{" "}
            <span className="hero-underline relative whitespace-nowrap text-accent">
              self-improving
            </span>{" "}
            A/B test.
          </h1>

          <p className="animate-pop hero-stagger-2 mt-6 max-w-xl text-pretty text-base leading-7 text-muted sm:text-lg sm:leading-8">
            Connect your real page and analytics. Claude proposes a hero variant and
            a hypothesis that respect your design system and guardrails — you approve
            it, Beagle ships it with cookie-based assignment, then reads the{" "}
            <span className="font-medium text-ink">real results</span> back and breaks
            them down per segment.
          </p>

          <div className="animate-pop hero-stagger-2 mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onStart}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-[0_8px_22px_-8px_rgba(36,87,72,0.55)] hover:-translate-y-0.5"
            >
              <PlayCircle size={18} />
              See it work
            </button>
            <button
              type="button"
              onClick={onConfigure}
              className="glass inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-ink shadow-sm hover:-translate-y-0.5"
            >
              <Plug size={17} />
              Connect your site
            </button>
            <button
              type="button"
              onClick={onMethodology}
              className="glass inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-ink shadow-sm hover:-translate-y-0.5"
            >
              <BookOpen size={17} />
              How it works
            </button>
          </div>

          <ul className="animate-pop hero-stagger-3 mt-8 grid gap-x-5 gap-y-2.5 text-[13px] text-muted sm:grid-cols-2">
            {PILLARS.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2">
                <Icon size={15} className="shrink-0 text-accent" aria-hidden />
                {label}
              </li>
            ))}
          </ul>

          {/* Loop / stats strip — a designed footer element, not an afterthought */}
          <div className="hero-loop animate-pop hero-stagger-4 mt-9 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
            <span className="font-medium text-muted">The loop:</span>
            {LOOP.map((step, i) => (
              <span key={step} className="inline-flex items-center gap-2">
                {i > 0 && <span className="h-px w-5 bg-edge" aria-hidden />}
                <span className="font-medium text-ink">{step}</span>
              </span>
            ))}
            <span className="text-muted">— nothing goes live without your approval.</span>
          </div>
        </div>

        {/* ── Right column: elevated product centerpiece ───────────────────── */}
        <div className="relative z-10 min-w-0">
          <div className="hero-showcase animate-pop hero-stagger-3 relative mx-auto max-w-xl px-3 lg:mx-0">
            {/* Floating accent chips around the panel. Kept inside the column's
                padding so they never clip against the section's overflow edge. */}
            <div
              className="hero-float-chip hero-chip-float pointer-events-none absolute -left-1 top-1/3 z-20 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-win sm:inline-flex"
              aria-hidden
            >
              <TrendingUp size={13} />
              +81% CTR
            </div>
            <div
              className="hero-float-chip hero-chip-float-2 pointer-events-none absolute -right-1 top-1/2 z-20 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink sm:inline-flex"
              aria-hidden
            >
              <BarChart3 size={13} className="text-accent" />
              Real GA4
            </div>
            <div
              className="hero-float-chip hero-chip-float pointer-events-none absolute -bottom-3 left-12 z-20 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-muted sm:inline-flex"
              aria-hidden
            >
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-win" />
              live
            </div>

            <div className="hero-showcase-panel">
              <HeroEvolutionVisual />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
