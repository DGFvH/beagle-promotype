import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Layers3,
  Maximize2,
  Minimize2,
  PlayCircle,
  Sparkles,
  X,
} from "lucide-react";

const ICONS = {
  promise: Sparkles,
  evolution: Layers3,
  live: PlayCircle,
  decision: BarChart3,
  lineage: GitBranch,
  methodology: BookOpen,
};

export default function WalkthroughRail({
  steps,
  currentIndex,
  collapsed,
  onStepChange,
  onToggleCollapsed,
  onClose,
}) {
  const step = steps[currentIndex];
  const atStart = currentIndex === 0;
  const atEnd = currentIndex === steps.length - 1;
  const progress = ((currentIndex + 1) / steps.length) * 100;
  const StepIcon = ICONS[step.id] ?? Sparkles;

  if (collapsed) {
    return (
      <section className="walkthrough-rail mb-4 rounded-lg border border-edge bg-surface px-3 py-2 shadow-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-white">
            <StepIcon size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-ink">
              {currentIndex + 1}/{steps.length} / {step.label}
            </div>
            <div className="truncate text-[11px] text-muted">{step.title}</div>
          </div>
          <RailButton
            label="Previous step"
            onClick={() => onStepChange(currentIndex - 1)}
            disabled={atStart}
          >
            <ChevronLeft size={16} />
          </RailButton>
          <RailButton
            label="Next step"
            onClick={() => onStepChange(currentIndex + 1)}
            disabled={atEnd}
          >
            <ChevronRight size={16} />
          </RailButton>
          <RailButton label="Expand walkthrough" onClick={onToggleCollapsed}>
            <Maximize2 size={15} />
          </RailButton>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="walkthrough-rail mb-5 rounded-lg border border-edge bg-surface p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-white">
              <StepIcon size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-muted">
                Walkthrough {currentIndex + 1} of {steps.length}
              </div>
              <h2 className="truncate text-sm font-semibold text-ink">{step.title}</h2>
            </div>
          </div>
          <p className="max-w-2xl text-[13px] leading-relaxed text-muted">{step.body}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <RailButton
            label="Previous step"
            onClick={() => onStepChange(currentIndex - 1)}
            disabled={atStart}
          >
            <ChevronLeft size={16} />
          </RailButton>
          <RailButton
            label="Next step"
            onClick={() => onStepChange(currentIndex + 1)}
            disabled={atEnd}
            primary
          >
            <ChevronRight size={16} />
          </RailButton>
          <RailButton label="Collapse walkthrough" onClick={onToggleCollapsed}>
            <Minimize2 size={15} />
          </RailButton>
          <RailButton label="Close walkthrough" onClick={onClose}>
            <X size={15} />
          </RailButton>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {steps.map((s, i) => {
          const Icon = ICONS[s.id] ?? Sparkles;
          const active = i === currentIndex;
          const complete = i < currentIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onStepChange(i)}
              className={`min-w-0 rounded-lg border px-2 py-2 text-left ${
                active
                  ? "border-accent bg-accent text-white"
                  : complete
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : "border-edge bg-surface-2 text-muted hover:text-ink"
              }`}
              title={s.title}
            >
              <div className="flex items-center gap-1.5">
                <Icon size={14} strokeWidth={2} />
                <span className="truncate text-[11px] font-semibold">{s.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RailButton({ label, onClick, disabled, primary, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border text-sm disabled:cursor-not-allowed disabled:opacity-35 ${
        primary
          ? "border-accent bg-accent text-white hover:bg-accent-strong"
          : "border-edge bg-surface-2 text-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
