import { BookOpen, PlayCircle, SlidersHorizontal } from "lucide-react";
import HeroEvolutionVisual from "./HeroEvolutionVisual.jsx";

const LOOP = ["Test", "Measure", "Decide", "Evolve"];

export default function Hero({ onStart, onMethodology, onConfigure }) {
  return (
    <section className="hero-stage flex w-full flex-col justify-between overflow-hidden">
      <div className="relative z-10 max-w-4xl animate-pop hero-stagger-1 pt-4 sm:pt-6">
        <p className="text-sm font-semibold text-accent">beagle</p>
        <h1 className="mt-2 max-w-4xl text-5xl font-semibold leading-[1.02] text-ink sm:text-7xl">
          Autonomous UI experiments that evolve in front of the room.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
          Load the populated experiment, walk through eight completed
          generations, finish generation 9 live, and prove the lineage behind
          every interface decision.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="btn-primary inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold"
          >
            <PlayCircle size={18} />
            Start walkthrough
          </button>
          <button
            type="button"
            onClick={onConfigure}
            className="inline-flex items-center gap-2 rounded-lg border border-edge bg-surface px-4 py-3 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <SlidersHorizontal size={17} />
            Configure
          </button>
          <button
            type="button"
            onClick={onMethodology}
            className="inline-flex items-center gap-2 rounded-lg border border-edge bg-surface px-4 py-3 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <BookOpen size={17} />
            Methodology
          </button>
        </div>
      </div>

      <div className="animate-pop hero-stagger-2 mt-8 min-w-0">
        <HeroEvolutionVisual />
      </div>

      <div className="hero-loop mt-6 flex flex-wrap items-center gap-2 pb-1 text-xs text-muted">
        {LOOP.map((step, i) => (
          <span key={step} className="inline-flex items-center gap-2">
            {i > 0 && (
              <span className="h-px w-5 bg-edge" aria-hidden />
            )}
            <span className="font-medium text-ink">{step}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
