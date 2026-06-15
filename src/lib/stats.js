// Lightweight statistics helpers for the demo dashboard.
//
// NOTE: This is intentionally rough. Real, trustworthy A/B testing needs
// always-valid / sequential tests (to avoid the peeking problem), multiple-
// comparison control, and proper power analysis. See the "out of scope" notes
// in the README. Here we only want a plausible-looking confidence indicator.

// Standard normal CDF via the Abramowitz & Stegun approximation.
export function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

// Two-proportion z-test. Returns the one-sided confidence (0..1) that
// rate A is genuinely different from rate B in the observed direction.
export function proportionConfidence(clicksA, nA, clicksB, nB) {
  if (nA < 1 || nB < 1) return 0;
  const pA = clicksA / nA;
  const pB = clicksB / nB;
  const pPool = (clicksA + clicksB) / (nA + nB);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));
  if (se === 0) return 0;
  const z = Math.abs(pA - pB) / se;
  // Confidence that the leader is truly ahead (one-sided).
  return clamp01(normalCdf(z));
}

// Two-sample confidence for means (e.g. time-to-action), normal approximation.
export function meanConfidence(meanA, sdA, nA, meanB, sdB, nB) {
  if (nA < 2 || nB < 2) return 0;
  const se = Math.sqrt((sdA * sdA) / nA + (sdB * sdB) / nB);
  if (se === 0) return 0;
  const z = Math.abs(meanA - meanB) / se;
  return clamp01(normalCdf(z));
}

export function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((a, b) => a + (b - m) * (b - m), 0) / (arr.length - 1);
  return Math.sqrt(v);
}

export function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Box–Muller transform for a roughly normal sample.
export function gaussian(mu = 0, sigma = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mu + sigma * n;
}
