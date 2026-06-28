import {
  BookOpen,
  PlayCircle,
  Plug,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Users,
} from "lucide-react";
import HeroEvolutionVisual from "./HeroEvolutionVisual.jsx";

const LOOP = ["Test", "Measure", "Decide", "Evolve"];

const PILLARS = [
  { icon: Sparkles, label: "Claude proposes the variant" },
  { icon: ShieldCheck, label: "Respects your design system & guardrails" },
  { icon: BarChart3, label: "Real GA4 results, read back live" },
  { icon: Users, label: "Per-segment breakdown" },
];

export default function Hero({ onStart, onMethodology, onConfigure }) {
  return (
    <section className="hero-stage flex w-full flex-col justify-between overflow-hidden">
      <div className="relative z-10 max-w-4xl animate-pop hero-stagger-1 pt-4 sm:pt-6">
        <p className="text-sm font-semibold tracking-tight text-accent">beagle</p>
        <h1 className="mt-2 max-w-4xl text-balance text-4xl font-semibold leading-[1.04] tracking-tight text-ink sm:text-6xl">
          Let Claude turn your hero section into a self-improving A/B test.
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted sm:text-lg">
          Connect your real page and analytics. Claude proposes a hero variant and
          a hypothesis that respect your design system and guardrails — you approve
          it, Beagle ships it with cookie-based assignment, then reads the{" "}
          <span className="font-medium text-ink">real results</span> back and breaks
          them down per segment.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="btn-primary inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold"
          >
            <PlayCircle size={18} />
            See it work
          </button>
          <button
            type="button"
            onClick={onConfigure}
            className="inline-flex items-center gap-2 rounded-lg border border-edge bg-surface px-4 py-3 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <Plug size={17} />
            Connect your site
          </button>
          <button
            type="button"
            onClick={onMethodology}
            className="inline-flex items-center gap-2 rounded-lg border border-edge bg-surface px-4 py-3 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <BookOpen size={17} />
            How it works
          </button>
        </div>

        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
          {PILLARS.map(({ icon: Icon, label }) => (
            <li key={label} className="inline-flex items-center gap-1.5">
              <Icon size={15} className="text-accent" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="animate-pop hero-stagger-2 mt-8 min-w-0">
        <HeroEvolutionVisual />
      </div>

      <div className="hero-loop mt-6 flex flex-wrap items-center gap-2 pb-1 text-xs text-muted">
        <span className="font-medium text-muted">The loop:</span>
        {LOOP.map((step, i) => (
          <span key={step} className="inline-flex items-center gap-2">
            {i > 0 && <span className="h-px w-5 bg-edge" aria-hidden />}
            <span className="font-medium text-ink">{step}</span>
          </span>
        ))}
        <span className="text-muted">— nothing goes live without your approval.</span>
      </div>
    </section>
  );
}
