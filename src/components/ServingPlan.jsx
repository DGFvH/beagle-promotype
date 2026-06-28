// FR-H3 (display half) — "unique hero per target group".
// Renders the per-segment serving plan ("serve variant X to segment A, variant
// Y to segment B") derived from FR-G2's perSegmentRecommendations via the pure
// toServingPlan selector (src/lib/serving.js). Divergent segments — those whose
// winner overrides the aggregate winner — are flagged.
//
// The cookie-based, segment-aware ASSIGNMENT (FR-H3 `auto`) is NOT wired here:
// it depends on FR-D2 cookie injection. This view expresses/displays the plan
// only; the seam where assignment plugs in is marked below.
//
//   TODO(beagle-integrations / FR-D2): wire cookie-based segment-aware serving.
//   The plan rows (each { segment, variantId, variantConfig, appliable }) are
//   the contract the injection layer consumes to assign a returning visitor in
//   `segment` to `variantId` via a sticky cookie. The "Apply per-segment serving"
//   action below is intentionally disabled until that lands (no fake go-live).
import { Layers, Users, AlertTriangle, Cookie } from "lucide-react";
import MenuPreview from "./MenuPreview.jsx";

export default function ServingPlan({ plan, metric, isSimulated }) {
  if (!plan || plan.segmentCount === 0) {
    return (
      <div className="rounded-lg border border-dashed border-edge bg-surface p-8 text-center shadow-sm">
        <p className="text-sm text-muted">
          No per-segment plan yet. Once a round has segment data, the
          recommended hero per target group appears here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-accent/10 text-accent">
            <Users size={19} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-ink">
              Unique hero per target group
            </h3>
            <p className="text-sm text-muted">
              Serve the winning hero to each {plan.dimension} segment for{" "}
              {metric.short}.
              {plan.divergentCount > 0
                ? ` ${plan.divergentCount} segment${
                    plan.divergentCount > 1 ? "s" : ""
                  } override the overall winner.`
                : " All segments currently agree with the overall winner."}
            </p>
          </div>
        </div>
        {isSimulated && (
          <span className="rounded-md border border-amber-300/40 bg-amber-100/40 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            Simulation — not live analytics yet
          </span>
        )}
      </div>

      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {plan.rows.map((row) => (
          <li
            key={row.segment}
            className={`flex flex-col rounded-lg border p-3 ${
              row.divergesFromAggregate
                ? "border-amber-300 bg-amber-50/60"
                : "border-edge bg-surface-2"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Layers size={14} className="text-muted" />
                {row.segmentLabel}
              </span>
              {row.divergesFromAggregate && (
                <span
                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                  title="This segment's winner overrides the overall winner."
                >
                  <AlertTriangle size={11} />
                  override
                </span>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
              <span>serve</span>
              <span className="rounded border border-edge bg-surface px-1.5 py-0.5 font-semibold text-ink">
                {row.variantLabel ?? "--"}
              </span>
              {row.metricValue != null && (
                <span className="tabular-nums">
                  / {metric.format(row.metricValue)}
                </span>
              )}
            </div>

            {row.variantConfig ? (
              <div className="mt-2">
                <MenuPreview config={row.variantConfig} variant="compact" />
              </div>
            ) : (
              <div className="mt-2 rounded-md border border-dashed border-edge bg-surface px-2 py-3 text-center text-[11px] text-muted">
                hero preview unavailable
              </div>
            )}

            {row.confidence && (
              <div className="mt-2 text-[10px] text-muted">
                {row.confidence.pct}% conf (rough)
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* FR-D2 seam: segment-aware cookie assignment plugs in here. Disabled
          until FR-D2 lands so nothing fake goes live (Section 6 / Section 8). */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-edge bg-surface-2 p-3">
        <div className="flex items-start gap-2">
          <Cookie size={16} className="mt-0.5 shrink-0 text-muted" />
          <p className="text-[12px] leading-snug text-muted">
            Per-segment serving is <span className="font-semibold text-ink">displayed</span>,
            not yet served. Cookie-based, segment-aware assignment lands with
            injection (FR-D2).
          </p>
        </div>
        <button
          type="button"
          disabled
          title="Available once cookie-based injection (FR-D2) is wired."
          className="cursor-not-allowed rounded-md border border-edge bg-surface px-3 py-1.5 text-xs font-medium text-muted opacity-70"
        >
          Apply per-segment serving (FR-D2)
        </button>
      </div>
    </div>
  );
}
