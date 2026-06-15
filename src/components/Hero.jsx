import HeroEvolutionVisual from "./HeroEvolutionVisual.jsx";

const LOOP = ["Test", "Measure", "Decide", "Evolve"];

export default function Hero({ onStart, onMethodology, onConfigure }) {
  return (
    <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:gap-12">
      <div className="animate-pop hero-stagger-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted">
          Automated experimentation
        </p>

        <h1 className="mt-3 max-w-md text-[2.125rem] font-semibold leading-[1.15] tracking-tight text-ink sm:text-[2.625rem]">
          Navigate your UI to what works
        </h1>

        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
          beagle runs continuous A/B tests on your interface and breeds the next
          challenger each generation — no human in the loop.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            onClick={onStart}
            className="btn-primary rounded-lg px-7 py-3 text-sm font-medium"
          >
            Open populated demo
          </button>
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
          <button
            type="button"
            onClick={onConfigure}
            className="text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Configure new experiment
          </button>
          <span className="text-edge" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={onMethodology}
            className="text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            How it works
          </button>
        </p>

        <div className="hero-loop mt-10 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-muted">
          {LOOP.map((step, i) => (
            <span key={step} className="inline-flex items-center gap-2">
              {i > 0 && (
                <span className="text-edge" aria-hidden>
                  →
                </span>
              )}
              <span className="font-medium text-ink">{step}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="animate-pop hero-stagger-2 min-w-0">
        <HeroEvolutionVisual />
      </div>
    </div>
  );
}
