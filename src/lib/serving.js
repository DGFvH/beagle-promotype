// ---------------------------------------------------------------------------
// FR-H3 (display half): per-segment serving plan
// ---------------------------------------------------------------------------
// Pure, unit-testable selector that turns the per-segment recommendation feed
// from analysis.js (perSegmentRecommendations) into the "serve variant X to
// segment A, variant Y to segment B" expression the FR-H3 view renders.
//
// This is the DISPLAY/EXPRESSION of the plan only. The actual cookie-based,
// segment-aware variant assignment (FR-H3 `auto`) depends on FR-D2 cookie
// injection, which is not built yet. This module deliberately does NOT fake
// that wiring — it produces a serializable plan that the FR-D2 wave consumes.
//
//   TODO(beagle-integrations / FR-D2): cookie-based segment-aware assignment
//   plugs in here. The injection layer reads this serving plan (the array of
//   rows below, each { dimension, segment, variantId }) and assigns a returning
//   visitor in `segment` to `variantId` via a sticky cookie. Until then the
//   plan is display-only; `appliable` flags whether a row is ready to serve.
//
// No fabricated data (Section 6): recommendations already omit segments with no
// data, so an empty input yields an empty plan, not a placeholder.

// toServingPlan(recommendations, opts) ->
//   {
//     dimension,                 // e.g. "trafficSource" (null when empty)
//     rows: [{
//       segment, segmentLabel,
//       variantId, variantLabel,
//       variantConfig,           // hero config to serve (may be null)
//       metricId, metricValue,
//       confidence,              // { value, pct, rough, label } passthrough
//       divergesFromAggregate,   // true when this overrides the aggregate winner
//       appliable,               // true when a concrete variant + config exist
//     }],
//     segmentCount,              // number of segments with a plan row
//     divergentCount,            // rows whose winner overrides the aggregate
//     uniform,                   // true when every segment serves the same variant
//   }
//
// `recommendations` is the array from perSegmentRecommendations(). It is treated
// as read-only; this function never mutates it.
export function toServingPlan(recommendations, opts = {}) {
  const recs = Array.isArray(recommendations) ? recommendations : [];

  const rows = recs.map((r) => {
    const variantConfig = r.winnerConfig ?? null;
    return {
      segment: r.segment,
      segmentLabel: r.segmentLabel ?? r.segment,
      variantId: r.winnerVariantId ?? null,
      variantLabel: r.winnerLabel ?? null,
      variantConfig,
      metricId: r.metricId ?? opts.metricId ?? null,
      metricValue: r.metricValue ?? null,
      confidence: r.confidence ?? null,
      divergesFromAggregate: !!r.divergesFromAggregate,
      // A row is appliable (ready for FR-D2 cookie assignment) only when it
      // names a concrete variant AND carries the config to serve. No partial
      // rows are ever presented as ready.
      appliable: r.winnerVariantId != null && variantConfig != null,
    };
  });

  const dimension = recs.length ? recs[0].dimension ?? opts.dimension ?? null : null;
  const distinctVariants = new Set(rows.map((r) => r.variantId).filter((v) => v != null));

  return {
    dimension,
    rows,
    segmentCount: rows.length,
    divergentCount: rows.filter((r) => r.divergesFromAggregate).length,
    // Uniform: a single distinct winner across all segments (or no rows). When
    // uniform, segment-aware serving collapses to the aggregate plan.
    uniform: distinctVariants.size <= 1,
  };
}
