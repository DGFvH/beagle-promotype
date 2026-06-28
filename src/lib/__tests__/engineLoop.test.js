import { describe, it, expect } from "vitest";
import {
  makeVariant,
  emptyStats,
  simulateVisitors,
  metricValue,
  hasMetricData,
  leadingVariantId,
  roundConfidence,
  proposeChallenger,
  describeMutation,
  configKey,
  defaultHeroConfig,
  isValidHeroConfig,
  HERO_DESIGN_SPACE,
  simulateVisitorsBySegment,
  collapseSegments,
  SEGMENT_IDS,
} from "../engine.js";
import { buildDemoState, DEFAULT_CONFIG } from "../demoSeed.js";

// FR-A2 / Section 6 (auto): the core loop test -> measure -> decide -> evolve
// still runs against the new HERO design space, with no regression.
describe("FR-A2 engine loop over the hero design space (no regression)", () => {
  it("runs a full round and evolves a valid next-generation hero", async () => {
    const goal = "ctr";

    // test: set up champion + challenger hero variants (gen 1).
    const champion = makeVariant({
      experimentId: "t",
      generation: 1,
      label: "Champion",
      config: defaultHeroConfig(),
      isControl: true,
    });
    const challenger = makeVariant({
      experimentId: "t",
      generation: 1,
      label: "Challenger",
      config: { ...defaultHeroConfig(), layout: "center", media: "video" },
      isControl: false,
    });
    const variants = [champion, challenger];

    // measure: simulate traffic.
    let stats = { [champion.id]: emptyStats(), [challenger.id]: emptyStats() };
    stats = simulateVisitors(800, variants, 1, stats);

    expect(stats[champion.id].visitors).toBe(400);
    expect(stats[challenger.id].visitors).toBe(400);
    for (const v of variants) {
      expect(hasMetricData(goal, stats[v.id])).toBe(true);
      const val = metricValue(goal, stats[v.id]);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }

    // decide: a leader and a confidence number come out without throwing.
    const winnerId = leadingVariantId(goal, variants, stats);
    expect([champion.id, challenger.id]).toContain(winnerId);
    const conf = roundConfidence(goal, variants, stats);
    expect(conf).toBeGreaterThanOrEqual(0);
    expect(conf).toBeLessThanOrEqual(1);

    // evolve: the stub proposes a next-gen hero, still inside the design space.
    const winner = variants.find((v) => v.id === winnerId);
    const proposal = await proposeChallenger(winner, goal, []);
    expect(isValidHeroConfig(proposal.config)).toBe(true);
    expect(typeof proposal.rationale).toBe("string");
    expect(proposal.rationale.length).toBeGreaterThan(0);
    expect(proposal.source).toBe("simulated");

    // the evolved challenger differs from the winner by at least one attribute.
    expect(describeMutation(winner.config, proposal.config)).not.toBe("no change");
  });

  it("works for the conversion and timeToAction metrics too", async () => {
    const champion = makeVariant({
      experimentId: "t",
      generation: 1,
      label: "Champion",
      config: defaultHeroConfig(),
      isControl: true,
    });
    const challenger = makeVariant({
      experimentId: "t",
      generation: 1,
      label: "Challenger",
      config: { ...defaultHeroConfig(), media: "video" },
      isControl: false,
    });
    const variants = [champion, challenger];
    let stats = { [champion.id]: emptyStats(), [challenger.id]: emptyStats() };
    stats = simulateVisitors(1000, variants, 2, stats);

    for (const goal of ["conversion", "timeToAction"]) {
      const leader = leadingVariantId(goal, variants, stats);
      expect([champion.id, challenger.id]).toContain(leader);
      const conf = roundConfidence(goal, variants, stats);
      expect(conf).toBeGreaterThanOrEqual(0);
      expect(conf).toBeLessThanOrEqual(1);
    }
  });

  it("DEFAULT_CONFIG baseline is a valid hero", () => {
    expect(isValidHeroConfig(DEFAULT_CONFIG)).toBe(true);
  });

  // FR-G2 segment simulation must not regress the core loop: the per-segment
  // accumulators collapse to the same balanced, conserved flat aggregate the
  // existing loop relies on, and the leader/confidence functions still work.
  it("segment-aware simulation collapses to a valid flat aggregate", () => {
    const champion = makeVariant({ experimentId: "t", generation: 1, label: "Champion", config: defaultHeroConfig(), isControl: true });
    const challenger = makeVariant({ experimentId: "t", generation: 1, label: "Challenger", config: { ...defaultHeroConfig(), media: "video" }, isControl: false });
    const variants = [champion, challenger];
    const bySeg = simulateVisitorsBySegment(900, variants, 1, { seed: 5 });
    // every variant has every segment.
    for (const v of variants) {
      expect(Object.keys(bySeg[v.id]).sort()).toEqual([...SEGMENT_IDS].sort());
    }
    const flat = collapseSegments(bySeg);
    const total = variants.reduce((acc, v) => acc + flat[v.id].visitors, 0);
    expect(total).toBe(900);
    const leader = leadingVariantId("ctr", variants, flat);
    expect([champion.id, challenger.id]).toContain(leader);
    const conf = roundConfidence("ctr", variants, flat);
    expect(conf).toBeGreaterThanOrEqual(0);
    expect(conf).toBeLessThanOrEqual(1);
  });
});

// FR-A2 / Section 6 (auto): the lineage/history data shape the Timeline chart
// consumes is preserved across the hero migration.
describe("FR-A2 lineage/history shape preserved for the chart", () => {
  it("buildDemoState yields history rows with the chart-required fields", () => {
    const state = buildDemoState({
      experimentId: "exp",
      name: "Homepage hero",
      goalMetric: "ctr",
      makeVariant,
      configKey,
    });

    expect(state.history.length).toBeGreaterThan(0);
    let prevGen = 0;
    for (const round of state.history) {
      // fields read by Timeline.jsx
      expect(typeof round.generation).toBe("number");
      expect(round.generation).toBe(prevGen + 1);
      prevGen = round.generation;
      expect(typeof round.winnerValue).toBe("number");
      expect(typeof round.confidence).toBe("number");
      expect(typeof round.window).toBe("number");
      expect(Array.isArray(round.entries)).toBe(true);
      expect(round.entries.length).toBe(2);
      expect(round.entries.some((e) => e.isWinner)).toBe(true);
      for (const entry of round.entries) {
        expect(isValidHeroConfig(entry.config)).toBe(true);
      }
      // configKeys feed the engine's "don't repeat a tried config" logic.
      expect(Array.isArray(round.configKeys)).toBe(true);
    }

    // current live round is two valid hero variants with stats.
    expect(state.variants.length).toBe(2);
    for (const v of state.variants) {
      expect(isValidHeroConfig(v.config)).toBe(true);
      expect(state.stats[v.id]).toBeTruthy();
    }
  });

  it("each curated seed round changes exactly one hero attribute", () => {
    const state = buildDemoState({
      experimentId: "exp",
      name: "Homepage hero",
      goalMetric: "ctr",
      makeVariant,
      configKey,
    });
    const attrCount = Object.keys(HERO_DESIGN_SPACE).length;
    for (const round of state.history) {
      const [champ, chall] = round.entries;
      let diffs = 0;
      for (const key of Object.keys(HERO_DESIGN_SPACE)) {
        if (champ.config[key] !== chall.config[key]) diffs += 1;
      }
      expect(diffs).toBe(1); // isolates the effect, < attrCount
      expect(diffs).toBeLessThan(attrCount);
    }
  });
});
