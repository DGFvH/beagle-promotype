import { describe, it, expect } from "vitest";
import { METRICS, isBetter, pickBest } from "../metrics.js";

// Seed test that also documents direction-aware comparison, the contract the
// engine and winner-selection rely on (FR-B3 / FR-G1). Keep green across the
// hero design-space migration (FR-A2 no-regression bar).
describe("metrics direction-aware comparison", () => {
  it("treats higher as better for maximize metrics (ctr, conversion)", () => {
    expect(isBetter("ctr", 0.2, 0.1)).toBe(true);
    expect(isBetter("conversion", 0.1, 0.2)).toBe(false);
    expect(pickBest("ctr", 0.2, 0.1)).toBe(0.2);
  });

  it("treats lower as better for minimize metrics (timeToAction)", () => {
    expect(isBetter("timeToAction", 1.2, 2.5)).toBe(true);
    expect(pickBest("timeToAction", 1.2, 2.5)).toBe(1.2);
  });

  it("every metric declares a valid direction", () => {
    for (const m of Object.values(METRICS)) {
      expect(["maximize", "minimize"]).toContain(m.direction);
    }
  });
});
