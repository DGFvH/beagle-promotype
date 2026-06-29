import {
  BookOpen,
  PlayCircle,
  Plug,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Users,
  CheckCircle2,
} from "lucide-react";
import { LogoMark } from "./Logo.jsx";
import HeroEvolutionVisual from "./HeroEvolutionVisual.jsx";

const LOOP = ["Test", "Measure", "Decide", "Evolve"];

const PILLARS = [
  { icon: Sparkles, label: "Claude proposes the variant" },
  { icon: ShieldCheck, label: "Respects your design system & guardrails" },
  { icon: BarChart3, label: "Real GA4 results, read back live" },
  { icon: Users, label: "Per-segment breakdown" },
  { icon: CheckCircle2, label: "Human-approved - nothing ships unseen" },
];

export default function Hero({ onStart, onMethodology, onConfigure }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="hero-stage flex w-full flex-col justify-center overflow-hidden py-8 sm:py-12"
    >
      <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        {/* ── Left column: copy + CTAs + trust row ─────────────────────────── */}
        <div className="relative z-10 min-w-0">
          {/* Eyebrow — one refined pill (brand + product), the restrained badge
              treatment shared across all three references. */}
          <div className="animate-pop hero-stagger-1">
            <span className="hero-eyebrow inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[13px] font-semibold tracking-tight text-ink shadow-sm">
              <LogoMark size={18} />
              <span className="text-ink">beagle</span>
              <span className="h-3.5 w-px bg-edge" aria-hidden />
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent">
                <Sparkles size={12} aria-hidden />
                Powered by Claude
              </span>
            </span>
          </div>

          <h1
            id="hero-heading"
            className="hero-headline animate-pop hero-stagger-1 mt-6 text-balance font-sans font-semibold text-ink"
          >
            Let Claude turn your hero section into a{" "}
            <span className="hero-underline relative whitespace-nowrap text-accent">
              self-improving
            </span>{" "}
            A/B test.
          </h1>

          <p className="animate-pop hero-stagger-2 mt-5 max-w-xl text-pretty text-base leading-7 text-muted sm:text-[1.0625rem] sm:leading-8">
            Connect your real page and analytics. Claude proposes a hero variant and
            a hypothesis that respect your design system and guardrails. You approve
            it, Beagle ships it with cookie-based assignment, then reads the{" "}
            <span className="font-medium text-ink">real results</span> back and breaks
            them down per segment.
          </p>

          <div className="animate-pop hero-stagger-3 mt-7 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onStart}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-[0_8px_22px_-8px_rgba(36,87,72,0.55)] hover:-translate-y-0.5"
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
              className="inline-flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-muted hover:text-ink hover:-translate-y-0.5"
            >
              <BookOpen size={17} />
              How it works
            </button>
          </div>

          <ul className="animate-pop hero-stagger-4 mt-8 grid gap-x-6 gap-y-2.5 text-[13px] text-muted sm:grid-cols-2">
            {PILLARS.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2">
                <Icon size={15} className="shrink-0 text-accent" aria-hidden />
                {label}
              </li>
            ))}
          </ul>

          {/* Loop / stats strip — a designed footer element, dot-separated like
              the references' subtle trust rows. */}
          <div className="hero-loop animate-pop hero-stagger-5 mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
            <span className="font-semibold uppercase tracking-wide text-[11px] text-muted">
              The loop
            </span>
            {LOOP.map((step, i) => (
              <span key={step} className="inline-flex items-center gap-2">
                {i > 0 && <span className="h-px w-4 bg-edge" aria-hidden />}
                <span className="font-medium text-ink">{step}</span>
              </span>
            ))}
            <span className="text-muted">Nothing goes live without your approval.</span>
          </div>
        </div>

        {/* ── Right column: elevated product centerpiece ───────────────────── */}
        <div className="relative z-10 min-w-0">
          <div className="hero-showcase animate-pop hero-stagger-3 relative mx-auto max-w-xl px-3 lg:mx-0">
            {/* Floating accent chips — restraint over clutter (the references
                place chips only in genuine negative space, never over the
                mockup's content). The panel fills its column, so the one clean
                pocket of empty space is the bottom-left corner: we anchor a
                single "live traffic" chip there. The CTR lift already lives in
                the frame header, so no duplicate is needed. Decorative. */}
            <div
              className="hero-float-chip hero-chip-float pointer-events-none absolute -bottom-4 left-5 z-20 hidden -rotate-1 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-muted sm:inline-flex"
              aria-hidden
            >
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-win" />
              live traffic
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
