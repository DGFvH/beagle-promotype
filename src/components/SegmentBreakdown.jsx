// FR-G2 / FR-H2 — heterogeneity breakdown by segment. Renders the per-segment
// winner for the chosen metric and flags a segment whose winner diverges from
// the flat aggregate. Consumes the `analyzeHeterogeneity(...)` result shape
// (src/lib/analysis.js) so real analytics rows feed it unchanged once wired.
//
// Pure presentational: it takes the already-computed heterogeneity object from
// the experiment hook (segmentAnalysis) — clearly labelled `isSimulated` until
// real analytics segment rows land (Section 6: never present simulation as live).
import { Layers, AlertTriangle } from "lucide-react";

export default function SegmentBreakdown({ heterogeneity, metric, isSimulated }) {
  if (!heterogeneity || !heterogeneity.segments?.length) {
    return (
      <div className="rounded-lg border border-dashed border-edge bg-surface p-8 text-center shadow-sm">
        <p className="text-sm text-muted">
          No segment data yet. Run a round to break results down by segment.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-accent/10 text-accent">
            <Layers size={19} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-ink">
              Heterogeneity by {heterogeneity.dimension}
            </h3>
            <p className="text-sm text-muted">
              Per-segment winners for {metric.short}. A flat aggregate can hide a
              segment that prefers the other hero.
            </p>
          </div>
        </div>
        {isSimulated && (
          <span className="rounded-md border border-amber-300/40 bg-amber-100/40 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            Simulation — not live analytics yet
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {heterogeneity.segments.map((s) => (
          <div
            key={s.segment}
            className={`rounded-lg border p-3 ${
              s.divergesFromAggregate
                ? "border-amber-300 bg-amber-50/60"
                : "border-edge bg-surface-2"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{s.segmentLabel}</span>
              {s.divergesFromAggregate && (
                <span
                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                  title="This segment's winner differs from the overall winner."
                >
                  <AlertTriangle size={11} />
                  diverges
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1">
              {s.values.map((v) => (
                <div
                  key={v.variantId}
                  className={`flex items-center justify-between text-[12px] ${
                    v.variantId === s.winnerVariantId
                      ? "font-semibold text-ink"
                      : "text-muted"
                  }`}
                >
                  <span className="truncate">{v.label}</span>
                  <span className="tabular-nums">
                    {v.hasData ? metric.format(v.value) : "no data"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-muted">
              Winner: {s.winnerLabel ?? "--"} / {s.confidence.pct}% conf (rough)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
