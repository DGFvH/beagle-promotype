import { ArrowDown, GitBranch, TrendingUp } from "lucide-react";
import { HERO_EVOLUTION } from "../lib/demoSeed.js";
import MenuPreview from "./MenuPreview.jsx";

// Seeded generation CTR climb for the mini lineage sparkline (38% → 69%).
// Decorative trend only; the real numbers live in HERO_EVOLUTION / the engine.
const LINEAGE = [38, 41, 47, 49, 55, 58, 64, 69];

export default function HeroEvolutionVisual() {
  // Fail safely: never throw or fabricate if the seed inputs are absent.
  if (!HERO_EVOLUTION?.before?.config || !HERO_EVOLUTION?.after?.config) {
    return (
      <div className="hero-product-frame grid place-items-center overflow-hidden px-4 py-10 text-center">
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
    <div className="hero-product-frame overflow-hidden">
      {/* Frame chrome — product title + live signal + lift badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/60 bg-white/40 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white shadow-[0_6px_14px_-6px_rgba(36,87,72,0.7)]">
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
          <div className="inline-flex items-center gap-2 rounded-full border border-win/25 bg-win/10 px-3 py-1.5 text-xs font-semibold text-win">
            <TrendingUp size={14} />
            {delta} CTR lift
          </div>
        ) : null}
      </div>

      {/* Stacked champion → challenger so the panel reads tall in the column */}
      <div className="grid gap-3 p-4 sm:p-5">
        <PreviewPanel side={before} label="Current champion" />
        <div className="flex items-center justify-center" aria-hidden>
          <span className="glass-inset grid h-8 w-8 place-items-center rounded-full text-muted shadow-sm">
            <ArrowDown size={16} />
          </span>
        </div>
        <PreviewPanel side={after} label="Winning challenger" highlight />
      </div>

      {/* Mini lineage sparkline + the decision facts as a designed footer */}
      <div className="flex items-center justify-between gap-4 border-t border-edge/60 bg-white/30 px-5 py-3.5">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-muted">Lineage · generations</div>
          <div className="text-xs font-semibold text-ink">
            8 rounds, decided by Real GA4
          </div>
        </div>
        <LineageSparkline points={LINEAGE} />
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
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
            highlight
              ? "border-win/25 bg-win/10 text-win"
              : "border-edge/70 bg-white/50 text-muted"
          }`}
        >
          {side.metricLabel}
        </span>
      </div>
      <MenuPreview config={side.config} variant="hero" />
    </div>
  );
}

// Small inline trend line in teal — generations climbing. Pure SVG, no deps.
function LineageSparkline({ points }) {
  const w = 120;
  const h = 34;
  const pad = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = (w - pad * 2) / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${(w - pad).toFixed(1)},${h - pad}`;
  const last = coords[coords.length - 1];

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0"
      role="img"
      aria-label="Hero conversion climbing across 8 generations"
    >
      <defs>
        <linearGradient id="lineage-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#lineage-fill)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="var(--color-accent)" />
      <circle cx={last[0]} cy={last[1]} r="4.6" fill="var(--color-accent)" fillOpacity="0.18" />
    </svg>
  );
}
