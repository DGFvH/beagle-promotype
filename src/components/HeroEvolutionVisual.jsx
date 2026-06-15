import { HERO_EVOLUTION } from "../lib/demoSeed.js";
import MenuPreview from "./MenuPreview.jsx";

export default function HeroEvolutionVisual() {
  const { before, after, delta } = HERO_EVOLUTION;

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <PreviewPanel side={before} />
        <PreviewPanel side={after} highlight />
      </div>

      <div
        className="absolute left-1/2 top-[42%] z-10 hidden -translate-x-1/2 -translate-y-1/2 sm:flex"
        aria-hidden
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-edge bg-surface text-muted shadow-sm">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7h8M8 4l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full border border-edge bg-surface px-3 py-1 text-xs font-semibold tabular-nums text-win">
          {delta} CTR
        </span>
        <span className="text-xs text-muted">
          8 rounds decided · generation 9 ready in the live demo
        </span>
      </div>
    </div>
  );
}

function PreviewPanel({ side, highlight = false }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-muted">
          Generation {side.generation}
        </span>
        <span
          className={`text-[11px] font-semibold tabular-nums ${
            highlight ? "text-win" : "text-ink"
          }`}
        >
          {side.metricLabel}
        </span>
      </div>
      <MenuPreview config={side.config} variant="hero" />
    </div>
  );
}
