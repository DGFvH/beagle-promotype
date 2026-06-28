import { ArrowRight, GitBranch, TrendingUp } from "lucide-react";
import { HERO_EVOLUTION } from "../lib/demoSeed.js";
import MenuPreview from "./MenuPreview.jsx";

export default function HeroEvolutionVisual() {
  // Fail safely: never throw or fabricate if the seed inputs are absent.
  if (!HERO_EVOLUTION?.before?.config || !HERO_EVOLUTION?.after?.config) {
    return (
      <div className="hero-product-frame grid place-items-center rounded-lg border border-edge bg-surface px-4 py-10 text-center shadow-sm">
        <div className="max-w-xs">
          <div className="text-sm font-semibold text-ink">Hero preview unavailable</div>
          <p className="mt-1 text-xs text-muted">
            Connect a page to see your champion and challenger side by side.
          </p>
        </div>
      </div>
    );
  }

  const { before, after, delta } = HERO_EVOLUTION;

  return (
    <div className="hero-product-frame overflow-hidden rounded-lg border border-edge bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge bg-surface-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-white">
            <GitBranch size={16} />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-ink">Your homepage hero</div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <span
                className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-win"
                aria-hidden
              />
              Champion vs. Claude-proposed challenger
            </div>
          </div>
        </div>
        {delta ? (
          <div className="inline-flex items-center gap-2 rounded-md border border-win/25 bg-win/10 px-3 py-1.5 text-xs font-semibold text-win">
            <TrendingUp size={14} />
            {delta} CTR lift
          </div>
        ) : null}
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="grid gap-4 border-b border-edge p-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:border-b-0 lg:border-r">
          <PreviewPanel side={before} label="Current champion" />
          <div className="hidden items-center justify-center text-muted sm:flex">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-edge bg-surface">
              <ArrowRight size={18} />
            </span>
          </div>
          <PreviewPanel side={after} label="Winning challenger" highlight />
        </div>

        <div className="grid gap-3 bg-surface px-4 py-4 sm:grid-cols-3 lg:grid-cols-1">
          <StageMetric label="Decided by" value="Real GA4" />
          <StageMetric label="Segments" value="Per-source" />
          <StageMetric label="Goes live" value="On approval" accent />
        </div>
      </div>
    </div>
  );
}

function PreviewPanel({ side, label, highlight = false }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold text-muted">{label}</div>
          <div className="text-xs font-semibold text-ink">
            Variant {side.generation}
          </div>
        </div>
        <span
          className={`rounded-md border px-2 py-1 text-[11px] font-semibold tabular-nums ${
            highlight
              ? "border-win/25 bg-win/10 text-win"
              : "border-edge bg-surface-2 text-muted"
          }`}
        >
          {side.metricLabel}
        </span>
      </div>
      <MenuPreview config={side.config} variant="hero" />
    </div>
  );
}

function StageMetric({ label, value, accent = false }) {
  return (
    <div className="rounded-lg border border-edge bg-surface-2 px-3 py-3">
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold tabular-nums ${
          accent ? "text-accent" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
