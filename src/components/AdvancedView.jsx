// FR-H2 — Advanced data view. One place that exposes the lineage/history chart
// PLUS the per-segment heterogeneity breakdown (FR-G2) PLUS the "unique hero per
// target group" serving plan (FR-H3 display). Recharts stays lazy via Timeline
// (App.jsx lazy-imports this whole view, so the chart chunk is deferred too).
//
// The segment depth runs off the experiment hook's `segmentAnalysis` (simulated
// until real analytics rows land — clearly labelled), not a one-off sample.
import Timeline from "./Timeline.jsx";
import SegmentBreakdown from "./SegmentBreakdown.jsx";
import ServingPlan from "./ServingPlan.jsx";

export default function AdvancedView({ history, metric, segmentAnalysis }) {
  const isSimulated = segmentAnalysis?.isSimulated ?? false;

  return (
    <div className="space-y-5">
      {/* Lineage / history (FR-H2: lineage half) */}
      <Timeline history={history} metric={metric} />

      {/* Per-segment breakdown (FR-H2: FR-G2 segment depth) */}
      <SegmentBreakdown
        heterogeneity={segmentAnalysis?.heterogeneity}
        metric={metric}
        isSimulated={isSimulated}
      />

      {/* Unique hero per target group (FR-H3 display) */}
      <ServingPlan
        plan={segmentAnalysis?.servingPlan}
        metric={metric}
        isSimulated={isSimulated}
      />
    </div>
  );
}
