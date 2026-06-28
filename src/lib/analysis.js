// ---------------------------------------------------------------------------
// Results analysis (FR-G1) + heterogeneity / per-segment analysis (FR-G2)
// ---------------------------------------------------------------------------
// Pure, unit-testable analysis over a round's MEASURED data. Everything here
// consumes the engine's per-variant stats shape ({ visitors, clicks, converts,
// times }) and the per-variant-per-segment shape from
// simulateVisitorsBySegment ({ [variantId]: { [segmentId]: stats } }). The same
// functions are the seam real analytics rows feed later: an analytics adapter
// (FR-B2/FR-D3) just needs to emit the same stats shape per variant (and per
// segment) and these functions compute identically. No fabricated numbers — if
// a variant/segment has no data, it is reported as such (FR-G1 / Section 6).
//
// Confidence is the engine's intentionally ROUGH indicator (src/stats.js,
// Section 8: no production statistical rigor). Every confidence number that
// surfaces is tagged `rough: true` and carries a label so the UI never presents
// it as a production p-value.

import { isBetter, METRICS } from "./metrics.js";
import {
  metricValue,
  hasMetricData,
  roundConfidence,
  leadingVariantId,
  collapseVariantSegments,
  SEGMENTS,
  SEGMENT_DIMENSION,
} from "./engine.js";

export const CONFIDENCE_LABEL = "rough indicator (not a production p-value)";

// --- FR-G1: live results analysis -------------------------------------------
//
// analyzeRound(metricId, variants, statsByVariant, opts) ->
//   {
//     metric, variants: [{ id, label, isControl, value, visitors, hasData }],
//     leaderId, lead: { winnerId, value, runnerUpId, runnerUpValue, deltaAbs, deltaPct } | null,
//     confidence: { value, pct, rough, label },
//     hasData
//   }
//
// Per-variant metric values + the lead + a rough confidence indicator, all
// computed from the measured stats (never fabricated). `variants` is the round's
// variant list (id/label/isControl), statsByVariant the engine accumulator map.
export function analyzeRound(metricId, variants, statsByVariant) {
  const metric = METRICS[metricId];
  if (!metric) throw new Error(`Unknown metric: ${metricId}`);

  const rows = variants.map((v) => {
    const stats = statsByVariant[v.id];
    const has = hasMetricData(metricId, stats);
    return {
      id: v.id,
      label: v.label,
      isControl: !!v.isControl,
      value: has ? metricValue(metricId, stats) : null,
      visitors: stats?.visitors ?? 0,
      hasData: has,
    };
  });

  const withData = rows.filter((r) => r.hasData);
  const leaderId = leadingVariantId(metricId, variants, statsByVariant);
  const confValue = roundConfidence(metricId, variants, statsByVariant);

  let lead = null;
  if (leaderId && withData.length >= 1) {
    const winner = rows.find((r) => r.id === leaderId);
    const others = withData.filter((r) => r.id !== leaderId);
    // Runner-up = the best of the rest (direction-aware).
    let runnerUp = null;
    for (const r of others) {
      if (!runnerUp || isBetter(metricId, r.value, runnerUp.value)) runnerUp = r;
    }
    const deltaAbs = runnerUp ? winner.value - runnerUp.value : null;
    const deltaPct =
      runnerUp && runnerUp.value !== 0
        ? ((winner.value - runnerUp.value) / Math.abs(runnerUp.value)) * 100
        : null;
    lead = {
      winnerId: winner.id,
      winnerLabel: winner.label,
      value: winner.value,
      runnerUpId: runnerUp?.id ?? null,
      runnerUpValue: runnerUp?.value ?? null,
      deltaAbs,
      deltaPct,
    };
  }

  return {
    metric: { id: metricId, label: metric.label, short: metric.short },
    variants: rows,
    leaderId,
    lead,
    confidence: {
      value: confValue,
      pct: Math.round(confValue * 100),
      rough: true,
      label: CONFIDENCE_LABEL,
    },
    hasData: withData.length > 0,
  };
}

// --- FR-G1 (b): confirm / reject the hypothesis with the numbers -------------
//
// A hypothesis claims the CHALLENGER beats the CHAMPION on the chosen metric.
// We confirm it only when (a) the challenger actually leads (direction-aware via
// isBetter) AND (b) the rough confidence clears a threshold. Otherwise we
// reject, and always return the supporting numbers behind the call.
//
// hypothesisVerdict(metricId, variants, statsByVariant, opts) ->
//   {
//     verdict: "confirmed" | "rejected" | "inconclusive",
//     reason, championValue, challengerValue, deltaAbs, deltaPct,
//     challengerWins, confidence: { value, pct, rough, label },
//     threshold, metric
//   }
export function hypothesisVerdict(metricId, variants, statsByVariant, opts = {}) {
  const threshold = opts.confidenceThreshold ?? 0.9;
  const metric = METRICS[metricId];
  const champion = variants.find((v) => v.isControl) ?? variants[0];
  const challenger = variants.find((v) => !v.isControl) ?? variants[1];

  const champStats = statsByVariant[champion?.id];
  const challStats = statsByVariant[challenger?.id];
  const champHas = hasMetricData(metricId, champStats);
  const challHas = hasMetricData(metricId, challStats);

  const base = {
    metric: { id: metricId, label: metric.label, short: metric.short },
    championLabel: champion?.label ?? null,
    challengerLabel: challenger?.label ?? null,
    threshold,
  };

  if (!champHas || !challHas) {
    return {
      ...base,
      verdict: "inconclusive",
      reason: "Not enough data on one or both variants to decide.",
      championValue: champHas ? metricValue(metricId, champStats) : null,
      challengerValue: challHas ? metricValue(metricId, challStats) : null,
      deltaAbs: null,
      deltaPct: null,
      challengerWins: null,
      confidence: { value: 0, pct: 0, rough: true, label: CONFIDENCE_LABEL },
    };
  }

  const championValue = metricValue(metricId, champStats);
  const challengerValue = metricValue(metricId, challStats);
  const challengerWins = isBetter(metricId, challengerValue, championValue);
  const conf = roundConfidence(metricId, variants, statsByVariant);
  const deltaAbs = challengerValue - championValue;
  const deltaPct =
    championValue !== 0
      ? ((challengerValue - championValue) / Math.abs(championValue)) * 100
      : null;

  let verdict;
  let reason;
  if (challengerWins && conf >= threshold) {
    verdict = "confirmed";
    reason = `Challenger leads on ${metric.short} (${metric.format(
      challengerValue
    )} vs ${metric.format(championValue)}) at ${Math.round(conf * 100)}% confidence.`;
  } else if (challengerWins && conf < threshold) {
    verdict = "inconclusive";
    reason = `Challenger is ahead on ${metric.short} but confidence (${Math.round(
      conf * 100
    )}%) is below the ${Math.round(threshold * 100)}% bar.`;
  } else {
    verdict = "rejected";
    reason = `Challenger does not beat the champion on ${metric.short} (${metric.format(
      challengerValue
    )} vs ${metric.format(championValue)}).`;
  }

  return {
    ...base,
    verdict,
    reason,
    championValue,
    challengerValue,
    deltaAbs,
    deltaPct,
    challengerWins,
    confidence: {
      value: conf,
      pct: Math.round(conf * 100),
      rough: true,
      label: CONFIDENCE_LABEL,
    },
  };
}

// --- FR-G2: heterogeneity analysis ------------------------------------------
//
// Break a round down by segment, compute the per-segment leader, and flag when
// a segment's winner diverges from the aggregate winner. Aggregate = the result
// after collapsing all segments (so it equals the flat-stats analysis).
//
// analyzeHeterogeneity(metricId, variants, statsBySegment, opts) ->
//   {
//     aggregateWinnerId,
//     segments: [{
//       segment, segmentLabel, winnerVariantId, winnerLabel, winnerValue,
//       values: [{ variantId, label, value, visitors, hasData }],
//       confidence: { value, pct, rough, label },
//       divergesFromAggregate, hasData
//     }],
//     anyDivergence, dimension
//   }
//
// `statsBySegment` is { [variantId]: { [segmentId]: stats } } from
// simulateVisitorsBySegment (or a real analytics adapter producing the same).
export function analyzeHeterogeneity(metricId, variants, statsBySegment, opts = {}) {
  const segments = opts.segments ?? SEGMENTS;
  const dimension = opts.dimension ?? SEGMENT_DIMENSION;

  // Aggregate winner: collapse every variant's segments to a flat map.
  const flat = {};
  for (const v of variants) {
    flat[v.id] = collapseVariantSegments(statsBySegment[v.id] ?? {});
  }
  const aggregateWinnerId = leadingVariantId(metricId, variants, flat);

  const segs = segments.map((seg) => {
    // Build a flat per-variant map for THIS segment only.
    const segStats = {};
    for (const v of variants) {
      segStats[v.id] = (statsBySegment[v.id] ?? {})[seg.id] ?? null;
    }
    const values = variants.map((v) => {
      const s = segStats[v.id];
      const has = hasMetricData(metricId, s);
      return {
        variantId: v.id,
        label: v.label,
        value: has ? metricValue(metricId, s) : null,
        visitors: s?.visitors ?? 0,
        hasData: has,
      };
    });
    const winnerVariantId = leadingVariantId(metricId, variants, segStats);
    const winnerRow = values.find((r) => r.variantId === winnerVariantId) ?? null;
    const conf = roundConfidence(metricId, variants, segStats);
    const hasData = values.some((r) => r.hasData);

    return {
      segment: seg.id,
      segmentLabel: seg.label ?? seg.id,
      winnerVariantId,
      winnerLabel: winnerRow?.label ?? null,
      winnerValue: winnerRow?.value ?? null,
      values,
      confidence: {
        value: conf,
        pct: Math.round(conf * 100),
        rough: true,
        label: CONFIDENCE_LABEL,
      },
      // Divergence: this segment's winner differs from the aggregate winner.
      divergesFromAggregate:
        hasData &&
        winnerVariantId != null &&
        aggregateWinnerId != null &&
        winnerVariantId !== aggregateWinnerId,
      hasData,
    };
  });

  return {
    dimension,
    aggregateWinnerId,
    segments: segs,
    anyDivergence: segs.some((s) => s.divergesFromAggregate),
  };
}

// --- FR-G2 (c): per-segment recommendation feed for FR-H3 -------------------
//
// The stable, serialisable shape the "unique hero per target group" view
// (FR-H3) consumes: one recommendation per segment that has data, naming the
// winning variant for that segment. `variants` is used to attach the winning
// variant's config so FR-H3 can serve it directly.
//
//   perSegmentRecommendations(metricId, variants, statsBySegment, opts) ->
//     [
//       {
//         dimension,            // e.g. "trafficSource"
//         segment,              // e.g. "social"
//         segmentLabel,         // human label
//         winnerVariantId,      // variant to serve to this segment
//         winnerLabel,
//         winnerConfig,         // the hero config to serve (or null if unknown)
//         metricId,
//         metricValue,          // winning variant's value for this segment
//         confidence,           // { value, pct, rough, label } — rough indicator
//         divergesFromAggregate // true when this differs from the flat winner
//       },
//       ...
//     ]
//
// Segments with no data are omitted (no fabricated winners — Section 6).
export function perSegmentRecommendations(metricId, variants, statsBySegment, opts = {}) {
  const het = analyzeHeterogeneity(metricId, variants, statsBySegment, opts);
  const configById = Object.fromEntries(variants.map((v) => [v.id, v.config ?? null]));
  const labelById = Object.fromEntries(variants.map((v) => [v.id, v.label]));

  return het.segments
    .filter((s) => s.hasData && s.winnerVariantId != null)
    .map((s) => ({
      dimension: het.dimension,
      segment: s.segment,
      segmentLabel: s.segmentLabel,
      winnerVariantId: s.winnerVariantId,
      winnerLabel: labelById[s.winnerVariantId] ?? s.winnerLabel ?? null,
      winnerConfig: configById[s.winnerVariantId] ?? null,
      metricId,
      metricValue: s.winnerValue,
      confidence: s.confidence,
      divergesFromAggregate: s.divergesFromAggregate,
    }));
}
