// The outcome metrics a user can optimize for. Each declares a direction so
// the engine knows whether higher or lower is "better".

export const METRICS = {
  ctr: {
    id: "ctr",
    label: "Hero click-through rate",
    short: "CTR",
    unit: "%",
    direction: "maximize",
    help: "Share of visitors who click the hero CTA. Higher is better.",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    // For charting we want a single comparable number per round.
    toChart: (v) => +(v * 100).toFixed(2),
  },
  timeToAction: {
    id: "timeToAction",
    label: "Time to hero action",
    short: "Time-to-action",
    unit: "s",
    direction: "minimize",
    help: "Average seconds before a visitor clicks the hero CTA. Lower is better.",
    format: (v) => `${v.toFixed(2)}s`,
    toChart: (v) => +v.toFixed(2),
  },
  conversion: {
    id: "conversion",
    label: "Conversion rate",
    short: "Conversion",
    unit: "%",
    direction: "maximize",
    help: "Share of visitors who complete the target action. Higher is better.",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    toChart: (v) => +(v * 100).toFixed(2),
  },
};

export function isBetter(metricId, a, b) {
  const dir = METRICS[metricId].direction;
  if (dir === "maximize") return a > b;
  return a < b;
}

// Returns the better of two metric values.
export function pickBest(metricId, a, b) {
  return isBetter(metricId, a, b) ? a : b;
}
