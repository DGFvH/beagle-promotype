import { useEffect, useRef, useState } from "react";
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
      {/* Frame chrome — product title + live signal + lift badge. Borrowed from
          the references' app-window header: brand glyph, a tight title block,
          and a single high-value metric badge anchored to the right. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/60 bg-white/50 px-4 py-3 sm:px-5">
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
          <div className="hero-shimmer inline-flex items-center gap-1.5 rounded-full border border-win/25 bg-win/10 px-2.5 py-1 text-[11px] font-semibold text-win">
            <TrendingUp size={13} />
            {delta} CTR lift
          </div>
        ) : null}
      </div>

      {/* Stacked champion → challenger. Tighter gaps + the compact preview height
          keep the panel from reading hollow (the references favour a single,
          well-composed mockup over big empty boxes). */}
      <div className="grid gap-2.5 p-3.5 sm:p-4">
        <PreviewPanel side={before} label="Current champion" />
        <div className="flex items-center justify-center" aria-hidden>
          <span className="glass-inset grid h-7 w-7 place-items-center rounded-full text-muted shadow-sm">
            <ArrowDown size={15} />
          </span>
        </div>
        <PreviewPanel side={after} label="Winning challenger" highlight />
      </div>

      {/* Mini lineage sparkline + the decision facts as a designed footer. */}
      <div className="flex items-center justify-between gap-4 border-t border-edge/60 bg-white/40 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-muted">Lineage · generations</div>
          <div className="text-xs font-semibold text-ink">
            8 rounds, decided by Real GA4
          </div>
          <LiveTicker />
        </div>
        <LineageSparkline points={LINEAGE} />
      </div>
    </div>
  );
}

function PreviewPanel({ side, label, highlight = false }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-bold tabular-nums ${
              highlight
                ? "bg-win/15 text-win"
                : "bg-edge/50 text-muted"
            }`}
            aria-hidden
          >
            {side.generation}
          </span>
          <div>
            <div className="text-[11px] font-semibold leading-tight text-ink">{label}</div>
            <div className="text-[10px] leading-tight text-muted">
              Variant {side.generation}
            </div>
          </div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
            highlight
              ? "border-win/25 bg-win/10 text-win"
              : "border-edge/70 bg-white/60 text-muted"
          }`}
        >
          {side.metricLabel}
        </span>
      </div>
      {/* Wrap MenuPreview in our own framed tile so the preview reads as an
          elevated product shot. MenuPreview itself is read-only (owned by
          ui-ux); we only restyle the surround. */}
      <div className={`hero-mock overflow-hidden ${highlight ? "hero-mock-win" : ""}`}>
        <MenuPreview config={side.config} variant="compact" />
      </div>
    </div>
  );
}

// Live CTR ticker — gently ticks the headline CTR up toward the winning value so
// the card feels like it is improving 24/7. rAF-driven, capped, cleaned up on
// unmount; reduced motion shows the final value statically.
const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function LiveTicker() {
  const TARGET = 69; // matches the winning challenger CTR (HERO_EVOLUTION.after)
  const [val, setVal] = useState(() => (reducedMotion() ? TARGET : 64));

  useEffect(() => {
    if (reducedMotion()) return;
    let raf;
    let start;
    const FROM = 64;
    const DUR = 2600;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      if (start === undefined) start = now;
      const t = Math.min(1, (now - start) / DUR);
      setVal(Math.round((FROM + (TARGET - FROM) * ease(t)) * 10) / 10);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
      <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-win" aria-hidden />
      live CTR{" "}
      <span className="hero-tick font-semibold text-win">{val.toFixed(1)}%</span>
    </div>
  );
}

// Small inline trend line in teal — generations climbing. Pure SVG, no deps.
// The line draws on via stroke-dashoffset (CSS), the area/dot fade in after.
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

  // Measure the polyline's true length for an exact dash animation.
  const lineRef = useRef(null);
  const [len, setLen] = useState(260);
  useEffect(() => {
    const el = lineRef.current;
    if (el && typeof el.getTotalLength === "function") {
      const total = el.getTotalLength();
      if (total > 0) setLen(Math.ceil(total));
    }
  }, []);

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0"
      role="img"
      aria-label="Hero conversion climbing across 8 generations"
      style={{ "--spark-len": len }}
    >
      <defs>
        <linearGradient id="lineage-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon className="spark-area" points={area} fill="url(#lineage-fill)" />
      <polyline
        ref={lineRef}
        className="spark-line"
        points={line}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="spark-dot" cx={last[0]} cy={last[1]} r="2.6" fill="var(--color-accent)" />
      <circle
        className="spark-dot"
        cx={last[0]}
        cy={last[1]}
        r="4.6"
        fill="var(--color-accent)"
        fillOpacity="0.18"
      />
    </svg>
  );
}
