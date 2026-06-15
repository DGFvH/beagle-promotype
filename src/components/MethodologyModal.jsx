const REAL = [
  "The core loop: test → measure → decide → evolve → repeat, generation over generation.",
  "Live rendered menu variants (alignment, weight, icons) — the actual UI under test.",
  "Winner selection on your chosen goal metric, with direction-aware comparison.",
  "Evolution of a new challenger from the winner, with a recorded lineage and chart.",
  "Optional LLM challenger generation when an API key is configured.",
];

const SIMULATED = [
  "Visitor traffic is synthetic and lightly biased so the demo completes in seconds.",
  "The confidence indicator is a rough z-test approximation — illustrative only.",
  "A round window is a sample-size target, not a day or week of real traffic.",
];

const ROADMAP = [
  "Embed snippet on a customer site with real event tracking.",
  "Sequential / always-valid testing to avoid the peeking problem.",
  "Multi-armed bandits for continuous explore/exploit.",
  "Multiple-comparison control; power and sample-size analysis.",
  "Guards against novelty effects and seasonality.",
  "Safe rendering of model-generated UI beyond a constrained design space.",
];

export default function MethodologyModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="animate-pop max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl surface-card p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Methodology</h2>
            <p className="mt-1 text-sm text-muted">
              What is real in this build versus what is staged for the demo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-edge bg-surface px-3 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-ink"
          >
            Close
          </button>
        </div>

        <Section title="Implemented" items={REAL} />
        <Section title="Simulated" items={SIMULATED} />
        <Section title="Roadmap" items={ROADMAP} />
      </div>
    </div>
  );
}

function Section({ title, items }) {
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2 text-[13px] text-ink/85">
            <span className="mt-2 h-px w-3 shrink-0 bg-edge" />
            <span className="leading-relaxed">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
