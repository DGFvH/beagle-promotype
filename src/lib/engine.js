// ---------------------------------------------------------------------------
// Promotype demo engine
// ---------------------------------------------------------------------------
// Everything here is in-memory and synthetic. The engine owns three jobs:
//   1. Simulate visitor traffic against the current round's two variants.
//   2. Aggregate per-variant results for the selected goal metric.
//   3. Decide a winner and evolve a new challenger (the LLM hook lives here).
//
// The synthetic traffic is *lightly* biased toward objectively-better configs
// so that, across generations, the lineage tends to climb. That bias is the
// only thing standing in for "real users prefer this design".

import { gaussian, mean, stddev, proportionConfidence, meanConfidence, clamp01 } from "./stats.js";
import { METRICS, isBetter } from "./metrics.js";

let _idCounter = 0;
const uid = (prefix) => `${prefix}_${(_idCounter++).toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// --- Hidden "ground truth" ---------------------------------------------------
// The optimizer is, in effect, trying to discover these preferences. They are
// hidden from the UI; only the simulated outcomes reveal them.
const ALIGN_APPEAL = { left: 0.5, center: 0.62, right: 0.42 };
const WEIGHT_APPEAL = { normal: 0.0, bold: 0.05 };
const ICON_APPEAL = 0.07;
const SPACING_APPEAL = { compact: 0.0, comfortable: 0.03, loose: 0.05 };
const NAVSTYLE_APPEAL = { plain: 0.0, underline: 0.04, pills: 0.06 };

export function normalizeConfig(raw) {
  return {
    align: raw?.align ?? "left",
    weight: raw?.weight ?? "normal",
    icon: Boolean(raw?.icon),
    spacing: raw?.spacing ?? "comfortable",
    navStyle: raw?.navStyle ?? "plain",
  };
}

// Maps a variant config to a hidden "appeal" in roughly [0.4, 0.85].
export function configAppeal(config, generation = 0) {
  const c = normalizeConfig(config);
  const base =
    (ALIGN_APPEAL[c.align] ?? 0.45) +
    (WEIGHT_APPEAL[c.weight] ?? 0) +
    (c.icon ? ICON_APPEAL : 0) +
    (SPACING_APPEAL[c.spacing] ?? 0) +
    (NAVSTYLE_APPEAL[c.navStyle] ?? 0);
  const drift = Math.min(0.08, generation * 0.006);
  return clamp01(base + drift);
}

// Turn appeal into the per-session behaviour for each metric.
function simulateSession(variant, generation) {
  const appeal = configAppeal(variant.config, generation);

  // Click-through: a Bernoulli draw around the appeal.
  const clicked = Math.random() < appeal;

  // Conversion is rarer and conditional-ish on appeal.
  const converted = Math.random() < appeal * 0.55;

  // Time-to-action (seconds): more appeal => found faster. Floor + noise.
  const baseTime = 8.5 - appeal * 5.5; // ~3.8s (great) .. ~6.3s (poor)
  const time = Math.max(0.6, gaussian(baseTime, 1.1));

  return {
    id: uid("evt"),
    clicked,
    converted,
    time,
    timestamp: Date.now(),
  };
}

// --- Public API --------------------------------------------------------------

export function makeVariant({ experimentId, generation, label, config, isControl = false }) {
  return {
    id: uid("var"),
    experimentId,
    generation,
    label,
    config: normalizeConfig(config),
    isControl,
  };
}

// Empty per-variant accumulator.
export function emptyStats() {
  return { visitors: 0, clicks: 0, converts: 0, times: [] };
}

// Run `count` synthetic visitors, split evenly across the round's variants.
// Returns updated stats keyed by variantId (does not mutate input).
export function simulateVisitors(count, variants, generation, statsByVariant) {
  const next = {};
  for (const v of variants) {
    const prev = statsByVariant[v.id] ?? emptyStats();
    next[v.id] = {
      visitors: prev.visitors,
      clicks: prev.clicks,
      converts: prev.converts,
      times: prev.times.slice(),
    };
  }

  for (let i = 0; i < count; i++) {
    // Round-robin assignment keeps the split balanced even for small batches.
    const v = variants[i % variants.length];
    const s = next[v.id];
    const evt = simulateSession(v, generation);
    s.visitors += 1;
    if (evt.clicked) s.clicks += 1;
    if (evt.converted) s.converts += 1;
    if (evt.clicked) s.times.push(evt.time); // time-to-action only counts clickers
  }

  return next;
}

// Does this variant have enough data to report the given metric yet?
export function hasMetricData(metricId, stats) {
  if (!stats || stats.visitors === 0) return false;
  if (metricId === "timeToAction") return stats.times.length > 0;
  return true;
}

// Compute the goal-metric value for one variant from its accumulated stats.
export function metricValue(metricId, stats) {
  if (!stats || stats.visitors === 0) return 0;
  switch (metricId) {
    case "ctr":
      return stats.clicks / stats.visitors;
    case "conversion":
      return stats.converts / stats.visitors;
    case "timeToAction":
      return stats.times.length ? mean(stats.times) : 0;
    default:
      return 0;
  }
}

// A rough confidence (0..1) that the leading variant truly beats the other.
export function roundConfidence(metricId, variants, statsByVariant) {
  if (variants.length < 2) return 0;
  const [a, b] = variants;
  const sa = statsByVariant[a.id] ?? emptyStats();
  const sb = statsByVariant[b.id] ?? emptyStats();

  if (metricId === "timeToAction") {
    if (sa.times.length < 2 || sb.times.length < 2) return 0;
    return meanConfidence(
      mean(sa.times),
      stddev(sa.times),
      sa.times.length,
      mean(sb.times),
      stddev(sb.times),
      sb.times.length
    );
  }

  const successA = metricId === "conversion" ? sa.converts : sa.clicks;
  const successB = metricId === "conversion" ? sb.converts : sb.clicks;
  return proportionConfidence(successA, sa.visitors, successB, sb.visitors);
}

// Which variant currently leads on the goal metric? Returns its id (or null).
export function leadingVariantId(metricId, variants, statsByVariant) {
  let best = null;
  let bestVal = null;
  for (const v of variants) {
    const stats = statsByVariant[v.id];
    if (!hasMetricData(metricId, stats)) continue;
    const val = metricValue(metricId, stats);
    if (bestVal === null || isBetter(metricId, val, bestVal)) {
      bestVal = val;
      best = v.id;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// LLM HOOK
// ---------------------------------------------------------------------------
// Demo: returns a mutated config + a human rationale. Real version: a model
// proposes a new design from the winning variant, the goal, and the history of
// what has worked (see api/propose-challenger.js and src/lib/challenger.js).
//
//   - `winner`  : the winning Variant (config we mutate from)
//   - `goal`    : the metric id being optimized
//   - `history` : array of prior rounds (winner configs, results) for context
//
// Returns { config, rationale, source }. The orchestrator in challenger.js
// decides whether to call this stub or the real model endpoint.
export async function proposeChallenger(winner, goal, history) {
  const config = normalizeConfig(mutateConfig(winner.config, history, goal));
  return {
    config,
    rationale: stubRationale(winner.config, config, goal),
    source: "simulated",
  };
}

const GOAL_PHRASE = {
  ctr: "click-through",
  conversion: "conversion",
  timeToAction: "time-to-action",
};

// A plausible, goal-aware sentence explaining why this challenger was chosen.
// Makes the simulated path read as if a designer (or model) reasoned about it.
export function stubRationale(parent, child, goal) {
  const p = normalizeConfig(parent);
  const ch = normalizeConfig(child);
  const g = GOAL_PHRASE[goal] ?? "performance";
  if (!parent) return `Initial challenger to probe ${g}.`;
  if (p.align !== ch.align)
    return `Prior rounds favored stronger menu placement, so we're testing ${ch.align} alignment to lift ${g}.`;
  if (p.weight !== ch.weight)
    return ch.weight === "bold"
      ? `Bolding the labels to increase salience and push ${g} higher.`
      : `Lightening the labels to cut visual noise and improve ${g}.`;
  if (p.icon !== ch.icon)
    return ch.icon
      ? `Adding leading icons to speed up scanning and improve ${g}.`
      : `Removing icons to declutter the menu and improve ${g}.`;
  if (p.spacing !== ch.spacing)
    return `Adjusting item spacing to ${ch.spacing} to tune click accuracy for ${g}.`;
  if (p.navStyle !== ch.navStyle)
    return `Trying ${ch.navStyle} nav styling to clarify interactive targets.`;
  return `Iterating on the reigning champion to keep nudging ${g} upward.`;
}

// Mutation pool: change exactly ONE attribute so lineage reads sensibly.
function mutateConfig(config, history, goal) {
  const base = normalizeConfig(config);
  const seen = new Set((history ?? []).flatMap((r) => r.configKeys ?? []));
  seen.add(configKey(base));

  const candidates = [];

  for (const align of ["left", "center", "right"]) {
    if (align !== base.align) candidates.push({ ...base, align });
  }
  candidates.push({ ...base, weight: base.weight === "bold" ? "normal" : "bold" });
  candidates.push({ ...base, icon: !base.icon });
  for (const spacing of ["compact", "comfortable", "loose"]) {
    if (spacing !== base.spacing) candidates.push({ ...base, spacing });
  }
  for (const navStyle of ["plain", "underline", "pills"]) {
    if (navStyle !== base.navStyle) candidates.push({ ...base, navStyle });
  }

  // Prefer configs we haven't tried yet.
  const fresh = candidates.filter((c) => !seen.has(configKey(c)));
  const pool = fresh.length ? fresh : candidates;

  // Lightly bias toward more appealing mutations (exploit) while keeping
  // exploration, so the timeline trends up without being monotonic.
  const gen = (history?.length ?? 0) + 1;
  const weights = pool.map((c) => Math.pow(configAppeal(c, gen), 6));
  const chosen = weightedPick(pool, weights);
  return chosen;
}

function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function configKey(config) {
  const c = normalizeConfig(config);
  return `${c.align}|${c.weight}|${c.icon ? "icon" : "noicon"}|${c.spacing}|${c.navStyle}`;
}

// A short human label describing how a challenger differs from its parent.
export function describeMutation(parent, child) {
  const p = normalizeConfig(parent);
  const ch = normalizeConfig(child);
  if (!parent) return "Initial control";
  const diffs = [];
  if (p.align !== ch.align) diffs.push(`align → ${ch.align}`);
  if (p.weight !== ch.weight) diffs.push(`weight → ${ch.weight}`);
  if (p.icon !== ch.icon) diffs.push(ch.icon ? "added icons" : "removed icons");
  if (p.spacing !== ch.spacing) diffs.push(`spacing → ${ch.spacing}`);
  if (p.navStyle !== ch.navStyle) diffs.push(`navStyle → ${ch.navStyle}`);
  return diffs.length ? diffs.join(", ") : "no change";
}

export { uid, METRICS };
