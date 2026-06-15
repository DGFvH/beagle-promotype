import { CheckCircle2, FlaskConical, Route, X } from "lucide-react";

const REAL = [
  "The core loop: test, measure, decide, evolve, repeat across generations.",
  "Live rendered menu variants inside a constrained design space.",
  "Winner selection on the chosen goal metric, with direction-aware comparison.",
  "Evolution of a new challenger from the winner, with recorded lineage and charting.",
  "Optional LLM challenger generation when an API key is configured.",
];

const SIMULATED = [
  "Visitor traffic is synthetic and lightly biased so the demo completes in seconds.",
  "The confidence indicator is a rough z-test approximation for presentation only.",
  "A round window is a sample-size target, not a real day or week of traffic.",
];

const ROADMAP = [
  "Embed snippet on a customer site with real event tracking.",
  "Sequential and always-valid testing to avoid the peeking problem.",
  "Multi-armed bandits for continuous explore and exploit.",
  "Multiple-comparison control, power analysis, and sample-size analysis.",
  "Guards against novelty effects and seasonality.",
  "Safe rendering of model-generated UI beyond a constrained design space.",
];

export default function MethodologyModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
      onClick={onClose}
    >
      <div
        className="animate-pop max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-edge bg-surface p-6 shadow-xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Methodology</h2>
            <p className="mt-1 text-sm text-muted">
              What is implemented in this build versus what is staged for the demo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-edge bg-surface-2 text-muted hover:bg-surface hover:text-ink"
            aria-label="Close methodology"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <Section title="Implemented" items={REAL} icon={CheckCircle2} tone="win" />
        <Section title="Simulated" items={SIMULATED} icon={FlaskConical} tone="accent" />
        <Section title="Roadmap" items={ROADMAP} icon={Route} tone="muted" />
      </div>
    </div>
  );
}

function Section({ title, items, icon: Icon, tone }) {
  const toneClass = {
    win: "bg-win/10 text-win",
    accent: "bg-accent/10 text-accent",
    muted: "bg-surface-2 text-muted",
  }[tone];

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-md ${toneClass}`}>
          <Icon size={15} />
        </span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2 text-[13px] text-ink/85">
            <span className="mt-2 h-px w-3 shrink-0 bg-edge" />
            <span className="leading-relaxed">{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
