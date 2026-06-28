import { describe, it, expect } from "vitest";
import {
  analyzeRound,
  hypothesisVerdict,
  analyzeHeterogeneity,
  perSegmentRecommendations,
  CONFIDENCE_LABEL,
} from "../analysis.js";
import {
  emptyStats,
  collapseSegments,
  simulateVisitorsBySegment,
  makeVariant,
  defaultHeroConfig,
  SEGMENT_IDS,
} from "../engine.js";
import { buildSegmentSample } from "../demoSeed.js";

// Helper: build a flat per-variant stats object quickly.
const stat = (visitors, clicks, converts, times = []) => ({
  visitors,
  clicks,
  converts,
  times: times.slice(),
});

const champion = { id: "champ", label: "Champion", isControl: true, config: defaultHeroConfig() };
const challenger = { id: "chall", label: "Challenger", isControl: false, config: { ...defaultHeroConfig(), media: "video" } };
const variants = [champion, challenger];

// ---------------------------------------------------------------------------
// FR-G1 (a) `auto` foundation for the manual results view: per-variant values,
// the lead, and a (rough) confidence indicator are computed FROM the data.
// ---------------------------------------------------------------------------
describe("FR-G1 analyzeRound: per-variant values, lead, confidence from data", () => {
  it("computes per-variant metric values from measured stats (not fabricated)", () => {
    const stats = {
      champ: stat(1000, 300, 60), // ctr 0.30
      chall: stat(1000, 360, 80), // ctr 0.36
    };
    const r = analyzeRound("ctr", variants, stats);
    const champRow = r.variants.find((v) => v.id === "champ");
    const challRow = r.variants.find((v) => v.id === "chall");
    expect(champRow.value).toBeCloseTo(0.3, 5);
    expect(challRow.value).toBeCloseTo(0.36, 5);
    expect(champRow.hasData).toBe(true);
    expect(challRow.hasData).toBe(true);
  });

  it("identifies the lead direction-aware and reports the delta", () => {
    const stats = { champ: stat(1000, 300, 60), chall: stat(1000, 360, 80) };
    const r = analyzeRound("ctr", variants, stats);
    expect(r.leaderId).toBe("chall");
    expect(r.lead.winnerId).toBe("chall");
    expect(r.lead.runnerUpId).toBe("champ");
    expect(r.lead.deltaAbs).toBeCloseTo(0.06, 5);
    expect(r.lead.deltaPct).toBeCloseTo(20, 4); // (.36-.30)/.30 = 20%
  });

  it("is direction-aware for a minimize metric (timeToAction: lower wins)", () => {
    const stats = {
      champ: stat(100, 100, 0, [5, 5, 5, 5]),
      chall: stat(100, 100, 0, [3, 3, 3, 3]),
    };
    const r = analyzeRound("timeToAction", variants, stats);
    expect(r.leaderId).toBe("chall"); // faster is better
  });

  it("surfaces a rough, labelled confidence indicator (Section 8)", () => {
    const stats = { champ: stat(1000, 300, 60), chall: stat(1000, 360, 80) };
    const r = analyzeRound("ctr", variants, stats);
    expect(r.confidence.rough).toBe(true);
    expect(r.confidence.label).toBe(CONFIDENCE_LABEL);
    expect(r.confidence.value).toBeGreaterThan(0);
    expect(r.confidence.value).toBeLessThanOrEqual(1);
    expect(r.confidence.pct).toBe(Math.round(r.confidence.value * 100));
  });

  it("never fabricates a value for a variant with no data", () => {
    const stats = { champ: stat(1000, 300, 60), chall: emptyStats() };
    const r = analyzeRound("ctr", variants, stats);
    const challRow = r.variants.find((v) => v.id === "chall");
    expect(challRow.hasData).toBe(false);
    expect(challRow.value).toBeNull(); // not 0
  });
});

// ---------------------------------------------------------------------------
// FR-G1 (b) `auto`: confirm/reject hypothesis with the numbers, direction-aware.
// ---------------------------------------------------------------------------
describe("FR-G1 hypothesisVerdict: confirm/reject with supporting numbers", () => {
  it("confirms when the challenger wins with enough confidence", () => {
    const stats = { champ: stat(2000, 600, 0), chall: stat(2000, 760, 0) }; // .30 vs .38
    const v = hypothesisVerdict("ctr", variants, stats, { confidenceThreshold: 0.9 });
    expect(v.verdict).toBe("confirmed");
    expect(v.challengerWins).toBe(true);
    expect(v.championValue).toBeCloseTo(0.3, 5);
    expect(v.challengerValue).toBeCloseTo(0.38, 5);
    expect(v.deltaAbs).toBeCloseTo(0.08, 5);
    expect(v.confidence.rough).toBe(true);
    expect(v.reason).toMatch(/leads/i);
  });

  it("rejects when the challenger does NOT beat the champion", () => {
    const stats = { champ: stat(2000, 760, 0), chall: stat(2000, 600, 0) }; // champ wins
    const v = hypothesisVerdict("ctr", variants, stats);
    expect(v.verdict).toBe("rejected");
    expect(v.challengerWins).toBe(false);
    expect(v.deltaAbs).toBeLessThan(0);
  });

  it("is inconclusive when the challenger leads but confidence is low", () => {
    const stats = { champ: stat(20, 6, 0), chall: stat(20, 7, 0) }; // tiny sample
    const v = hypothesisVerdict("ctr", variants, stats, { confidenceThreshold: 0.95 });
    expect(v.verdict).toBe("inconclusive");
    expect(v.challengerWins).toBe(true);
  });

  it("is inconclusive when a variant has no data (no fabrication)", () => {
    const stats = { champ: stat(1000, 300, 0), chall: emptyStats() };
    const v = hypothesisVerdict("ctr", variants, stats);
    expect(v.verdict).toBe("inconclusive");
    expect(v.challengerValue).toBeNull();
  });

  it("is direction-aware: lower timeToAction confirms the challenger", () => {
    // alternate around the mean so there is variance (se > 0) -> real confidence.
    const champTimes = Array.from({ length: 200 }, (_, i) => (i % 2 ? 6.5 : 5.5));
    const challTimes = Array.from({ length: 200 }, (_, i) => (i % 2 ? 3.5 : 2.5));
    const stats = {
      champ: stat(200, 200, 0, champTimes),
      chall: stat(200, 200, 0, challTimes),
    };
    const v = hypothesisVerdict("timeToAction", variants, stats, { confidenceThreshold: 0.9 });
    expect(v.challengerWins).toBe(true);
    expect(v.verdict).toBe("confirmed");
  });
});

// ---------------------------------------------------------------------------
// FR-G2 (b) `judgment` core logic / (c) `auto`: heterogeneity + per-segment rec.
// ---------------------------------------------------------------------------
describe("FR-G2 analyzeHeterogeneity: divergent segment is flagged", () => {
  // Constructed dataset: challenger LOSES overall but WINS for the "social"
  // segment, so social must be flagged as divergent.
  function buildDivergentBySegment() {
    // organic: champion clearly ahead. paid: champion ahead. social: challenger ahead.
    return {
      champ: {
        organic: stat(500, 300, 0), // .60
        paid: stat(500, 300, 0), // .60
        social: stat(500, 150, 0), // .30
      },
      chall: {
        organic: stat(500, 250, 0), // .50
        paid: stat(500, 250, 0), // .50
        social: stat(500, 400, 0), // .80  <- wins here
      },
    };
  }

  it("flags the segment whose winner differs from the aggregate", () => {
    const bySeg = buildDivergentBySegment();
    const het = analyzeHeterogeneity("ctr", variants, bySeg);
    const flat = collapseSegments(bySeg);
    // aggregate winner derived from collapse must match het.aggregateWinnerId
    const aggClicksChamp = flat.champ.clicks / flat.champ.visitors;
    const aggClicksChall = flat.chall.clicks / flat.chall.visitors;
    const expectedAgg = aggClicksChall > aggClicksChamp ? "chall" : "champ";
    expect(het.aggregateWinnerId).toBe(expectedAgg);

    const social = het.segments.find((s) => s.segment === "social");
    expect(social.winnerVariantId).toBe("chall");
    // social diverges iff aggregate winner != chall
    expect(social.divergesFromAggregate).toBe(expectedAgg !== "chall");
    expect(het.anyDivergence).toBe(true);
  });

  it("every segment carries a rough, labelled confidence indicator", () => {
    const het = analyzeHeterogeneity("ctr", variants, buildDivergentBySegment());
    for (const s of het.segments) {
      expect(s.confidence.rough).toBe(true);
      expect(s.confidence.label).toBe(CONFIDENCE_LABEL);
    }
  });

  it("does not fabricate a winner for an empty segment", () => {
    const bySeg = {
      champ: { organic: stat(100, 50, 0), paid: emptyStats(), social: emptyStats() },
      chall: { organic: stat(100, 60, 0), paid: emptyStats(), social: emptyStats() },
    };
    const het = analyzeHeterogeneity("ctr", variants, bySeg);
    const paid = het.segments.find((s) => s.segment === "paid");
    expect(paid.hasData).toBe(false);
    expect(paid.winnerValue).toBeNull();
  });
});

describe("FR-G2 (c) perSegmentRecommendations: stable FR-H3 feed shape", () => {
  it("emits one recommendation per segment-with-data in the documented shape", () => {
    const bySeg = {
      champ: { organic: stat(500, 300, 0), paid: stat(500, 300, 0), social: stat(500, 150, 0) },
      chall: { organic: stat(500, 250, 0), paid: stat(500, 250, 0), social: stat(500, 400, 0) },
    };
    const recs = perSegmentRecommendations("ctr", variants, bySeg);
    expect(recs.length).toBe(3);
    for (const r of recs) {
      // exact contract FR-H3 will consume
      expect(typeof r.dimension).toBe("string");
      expect(SEGMENT_IDS).toContain(r.segment);
      expect(typeof r.segmentLabel).toBe("string");
      expect(["champ", "chall"]).toContain(r.winnerVariantId);
      expect(typeof r.winnerLabel).toBe("string");
      expect(r.winnerConfig).toBeTruthy(); // the hero config to serve
      expect(r.metricId).toBe("ctr");
      expect(typeof r.metricValue).toBe("number");
      expect(r.confidence.rough).toBe(true);
      expect(typeof r.divergesFromAggregate).toBe("boolean");
    }
    // the social rec serves the challenger config (the video hero)
    const social = recs.find((r) => r.segment === "social");
    expect(social.winnerVariantId).toBe("chall");
    expect(social.winnerConfig.media).toBe("video");
  });

  it("is JSON-serialisable (cross-owner contract for FR-H3)", () => {
    const recs = perSegmentRecommendations("ctr", variants, {
      champ: { organic: stat(100, 50, 0), paid: stat(100, 50, 0), social: stat(100, 50, 0) },
      chall: { organic: stat(100, 60, 0), paid: stat(100, 60, 0), social: stat(100, 60, 0) },
    });
    expect(() => JSON.stringify(recs)).not.toThrow();
    expect(JSON.parse(JSON.stringify(recs))).toEqual(recs);
  });

  it("omits segments with no data (no fabricated winners)", () => {
    const recs = perSegmentRecommendations("ctr", variants, {
      champ: { organic: stat(100, 50, 0), paid: emptyStats(), social: emptyStats() },
      chall: { organic: stat(100, 60, 0), paid: emptyStats(), social: emptyStats() },
    });
    expect(recs.map((r) => r.segment)).toEqual(["organic"]);
  });
});

// ---------------------------------------------------------------------------
// FR-A2 / Section 6 (auto): aggregate is UNCHANGED when segments collapse, and
// the seeded segment simulation is deterministic + genuinely heterogeneous.
// ---------------------------------------------------------------------------
describe("FR-A2/Section 6 no-regression: segment collapse == flat aggregate", () => {
  it("collapsing per-segment stats reproduces the flat per-variant aggregate", () => {
    const c = makeVariant({ experimentId: "t", generation: 1, label: "C", config: defaultHeroConfig(), isControl: true });
    const b = makeVariant({ experimentId: "t", generation: 1, label: "B", config: { ...defaultHeroConfig(), media: "video" }, isControl: false });
    const vs = [c, b];
    const bySeg = simulateVisitorsBySegment(1200, vs, 1, { seed: 7 });
    const flat = collapseSegments(bySeg);

    // visitor totals are conserved and balanced across the two variants.
    const total = flat[c.id].visitors + flat[b.id].visitors;
    expect(total).toBe(1200);
    // per-variant aggregate clicks equal the sum of its segment clicks.
    for (const v of vs) {
      const segSum = SEGMENT_IDS.reduce((acc, s) => acc + bySeg[v.id][s].clicks, 0);
      expect(flat[v.id].clicks).toBe(segSum);
      const visSum = SEGMENT_IDS.reduce((acc, s) => acc + bySeg[v.id][s].visitors, 0);
      expect(flat[v.id].visitors).toBe(visSum);
    }
  });

  it("the seeded simulation is deterministic", () => {
    const c = makeVariant({ experimentId: "t", generation: 1, label: "C", config: defaultHeroConfig(), isControl: true });
    const b = makeVariant({ experimentId: "t", generation: 1, label: "B", config: { ...defaultHeroConfig(), media: "video" }, isControl: false });
    const one = simulateVisitorsBySegment(800, [c, b], 1, { seed: 99 });
    const two = simulateVisitorsBySegment(800, [c, b], 1, { seed: 99 });
    expect(JSON.stringify(one)).toBe(JSON.stringify(two));
  });

  it("the demo segment sample diverges (challenger wins one segment, loses aggregate)", () => {
    const { variants: vs, statsBySegment } = buildSegmentSample({ seed: 1337 });
    const het = analyzeHeterogeneity("ctr", vs, statsBySegment);
    expect(het.anyDivergence).toBe(true);
    const divergent = het.segments.filter((s) => s.divergesFromAggregate);
    expect(divergent.length).toBeGreaterThanOrEqual(1);
    // the divergent segment's winner is not the aggregate winner.
    for (const s of divergent) {
      expect(s.winnerVariantId).not.toBe(het.aggregateWinnerId);
    }
  });
});
