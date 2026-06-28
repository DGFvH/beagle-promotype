import { describe, it, expect } from "vitest";
import { toServingPlan } from "../serving.js";
import { perSegmentRecommendations } from "../analysis.js";
import { buildSegmentSample } from "../demoSeed.js";

// ---------------------------------------------------------------------------
// FR-H3 (display): toServingPlan maps the per-segment recommendation feed into
// the "serve variant X to segment A" serving-plan rows the view renders, and
// flags divergence. The cookie-based assignment half (FR-H3 `auto`) is deferred
// to FR-D2; this proves only the display/expression selector.
// ---------------------------------------------------------------------------

const rec = (over = {}) => ({
  dimension: "trafficSource",
  segment: "organic",
  segmentLabel: "Organic search",
  winnerVariantId: "v_a",
  winnerLabel: "Champion",
  winnerConfig: { headline: "A" },
  metricId: "ctr",
  metricValue: 0.31,
  confidence: { value: 0.8, pct: 80, rough: true, label: "rough" },
  divergesFromAggregate: false,
  ...over,
});

describe("FR-H3 toServingPlan: recommendations -> serving plan rows", () => {
  it("maps each recommendation to a serving-plan row (serve variant X to segment A)", () => {
    const recs = [
      rec({ segment: "organic", segmentLabel: "Organic search", winnerVariantId: "v_a", winnerLabel: "Champion" }),
      rec({ segment: "social", segmentLabel: "Social", winnerVariantId: "v_b", winnerLabel: "Challenger", divergesFromAggregate: true }),
    ];
    const plan = toServingPlan(recs);

    expect(plan.dimension).toBe("trafficSource");
    expect(plan.segmentCount).toBe(2);
    expect(plan.rows.map((r) => [r.segment, r.variantLabel])).toEqual([
      ["organic", "Champion"],
      ["social", "Challenger"],
    ]);
  });

  it("flags rows whose winner diverges from the aggregate and counts them", () => {
    const recs = [
      rec({ segment: "organic", divergesFromAggregate: false }),
      rec({ segment: "social", winnerVariantId: "v_b", divergesFromAggregate: true }),
    ];
    const plan = toServingPlan(recs);

    expect(plan.divergentCount).toBe(1);
    expect(plan.rows.find((r) => r.segment === "social").divergesFromAggregate).toBe(true);
    expect(plan.uniform).toBe(false);
  });

  it("marks the plan uniform when every segment serves the same variant", () => {
    const recs = [
      rec({ segment: "organic", winnerVariantId: "v_a" }),
      rec({ segment: "social", winnerVariantId: "v_a" }),
    ];
    expect(toServingPlan(recs).uniform).toBe(true);
  });

  it("only marks a row appliable when a concrete variant AND config exist (no partial rows)", () => {
    const recs = [
      rec({ segment: "organic", winnerVariantId: "v_a", winnerConfig: { headline: "A" } }),
      rec({ segment: "social", winnerVariantId: "v_b", winnerConfig: null }),
    ];
    const plan = toServingPlan(recs);
    expect(plan.rows.find((r) => r.segment === "organic").appliable).toBe(true);
    expect(plan.rows.find((r) => r.segment === "social").appliable).toBe(false);
  });

  it("returns an empty plan for empty/invalid input (no fabricated rows)", () => {
    expect(toServingPlan([])).toMatchObject({ dimension: null, rows: [], segmentCount: 0, uniform: true });
    expect(toServingPlan(null).rows).toEqual([]);
    expect(toServingPlan(undefined).rows).toEqual([]);
  });

  it("works end-to-end off the real perSegmentRecommendations feed (seeded sample)", () => {
    const sample = buildSegmentSample({ goalMetric: "ctr" });
    const recs = perSegmentRecommendations("ctr", sample.variants, sample.statsBySegment);
    const plan = toServingPlan(recs);

    expect(plan.segmentCount).toBe(recs.length);
    expect(plan.segmentCount).toBeGreaterThan(0);
    // The seeded sample is built to diverge (video challenger wins social,
    // loses paid), so the plan must surface at least one override.
    expect(plan.divergentCount).toBeGreaterThan(0);
    expect(plan.uniform).toBe(false);
    // Every appliable row carries a config to serve (FR-D2 seam contract).
    for (const row of plan.rows.filter((r) => r.appliable)) {
      expect(row.variantConfig).toBeTruthy();
    }
  });
});
