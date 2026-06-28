// ---------------------------------------------------------------------------
// Promotype demo engine — HERO design space
// ---------------------------------------------------------------------------
// Everything here is in-memory and synthetic. The engine owns three jobs:
//   1. Simulate visitor traffic against the current round's two variants.
//   2. Aggregate per-variant results for the selected goal metric.
//   3. Decide a winner and evolve a new challenger (the LLM hook lives here).
//
// FR-A2: the optimisation target is the page **hero**, not the old nav menu.
// The design space is deliberately **enum-constrained** (Section 8: no
// open-ended, fully model-generated UI). Each attribute exposes a small set of
// safe options; a proposal — stub or Claude — can only ever pick from these.
// This module is the single source of truth for the hero variant shape, so the
// hypothesis (FR-C1) and injection (FR-D2) paths build against HERO_DESIGN_SPACE.
//
// The synthetic traffic is *lightly* biased toward objectively-better configs
// so that, across generations, the lineage tends to climb. That bias is the
// only thing standing in for "real users prefer this hero". It will be replaced
// by real analytics readout (FR-B2/FR-D3) — see loadCurrentHero() and the
// analytics owner's module for the seam.

import { gaussian, mean, stddev, proportionConfidence, meanConfidence, clamp01 } from "./stats.js";
import { METRICS, isBetter } from "./metrics.js";

let _idCounter = 0;
const uid = (prefix) => `${prefix}_${(_idCounter++).toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// ---------------------------------------------------------------------------
// HERO DESIGN SPACE (enum-constrained — Section 8)
// ---------------------------------------------------------------------------
// attribute -> { options:[...], default, label }. Keep option sets small and
// safe; copy attributes (headline/subheadline/ctaLabel) are a curated set of
// pre-approved strings rather than free text, so nothing arbitrary is rendered
// or injected. Add options here (and the appeal weights below) to widen the
// space; do NOT switch any attribute to free-form input in the MVP.
export const HERO_DESIGN_SPACE = {
  headline: {
    label: "Headline",
    default: "Build better landing pages, faster",
    options: [
      "Build better landing pages, faster",
      "Turn visitors into customers",
      "Ship a hero that converts",
      "Your landing page, optimized by AI",
    ],
  },
  subheadline: {
    label: "Subheadline",
    default: "An AB testing copilot for your hero section.",
    options: [
      "An AB testing copilot for your hero section.",
      "Connect your site and let Beagle do the testing.",
      "Evidence-based hero optimization, on autopilot.",
      "No more guessing which hero converts best.",
    ],
  },
  ctaLabel: {
    label: "Primary CTA label",
    default: "Get started",
    options: ["Get started", "Start free trial", "Book a demo", "Try Beagle"],
  },
  ctaStyle: {
    label: "CTA style",
    default: "solid",
    options: ["solid", "outline", "soft"],
  },
  layout: {
    label: "Layout / alignment",
    default: "left",
    options: ["left", "center", "split"],
  },
  media: {
    label: "Supporting media",
    default: "none",
    options: ["none", "illustration", "screenshot", "video"],
  },
};

// Ordered list of attribute keys — the canonical iteration order.
export const HERO_ATTRIBUTES = Object.keys(HERO_DESIGN_SPACE);

// Allowed-option lookups, reused by validation in challenger.js and api/.
export const HERO_OPTIONS = Object.fromEntries(
  HERO_ATTRIBUTES.map((k) => [k, HERO_DESIGN_SPACE[k].options])
);

// The default/fixture hero — used as the champion baseline until FR-A1 wires a
// real source. loadCurrentHero() is the extension seam the real connector fills.
export function defaultHeroConfig() {
  return Object.fromEntries(
    HERO_ATTRIBUTES.map((k) => [k, HERO_DESIGN_SPACE[k].default])
  );
}

// FR-A2 baseline seam, now wired to FR-A1 (beagle-integrations).
//
//   loadCurrentHero({ source, config }) -> { config, source, meta }
//
// `source` is the sanitized reference produced by /api/connect-source (NO
// secret): { kind, repo:{owner,name}, ref, page:{path,reason}, locator }. We
// best-effort map the located page onto HERO_DESIGN_SPACE so the connected
// page's hero becomes the champion baseline; if no source / no page / anything
// unmappable, we fall back cleanly to defaultHeroConfig(). `config` is always a
// fully-normalised hero config safe to render/optimize.
//
// Note: the browser never holds the GitHub token, so this maps from the located
// page REFERENCE (metadata), not raw page markup. The enum design space
// (Section 8) means we only ever pick safe, pre-approved option values — a real
// page can seed sensible defaults (e.g. layout from the page kind) but never
// inject arbitrary copy/markup. When markup-level extraction lands, it slots in
// behind heroConfigFromSource without changing this signature.
export function loadCurrentHero(opts = {}) {
  // An explicit config wins (tests / demo seed) — normalise and return.
  if (opts.config) {
    return {
      config: normalizeConfig(opts.config),
      source: opts.source ?? "fixture",
      meta: { label: "Current hero" },
    };
  }

  const source = opts.source ?? null;

  // No connected source -> fixture baseline (pre-connect / demo).
  if (!source || typeof source !== "object" || !source.page) {
    return {
      config: defaultHeroConfig(),
      source: source ?? "fixture",
      meta: {
        label: source
          ? "Current hero (no page located — fixture baseline)"
          : "Current hero (fixture baseline)",
      },
    };
  }

  // Map the located page reference onto the design space (best-effort).
  const config = heroConfigFromSource(source);
  const repoLabel = source.repo
    ? `${source.repo.owner}/${source.repo.name}`
    : source.locator ?? "connected source";
  return {
    config,
    source,
    meta: {
      label: `Current hero from ${repoLabel} (${source.page.path})`,
      pagePath: source.page.path,
      located: true,
    },
  };
}

// Best-effort: derive a hero config from a located-page reference. Starts from
// the default (every attribute valid) and nudges layout based on the kind of
// page found, so a connected real page reads slightly differently from the bare
// fixture without ever leaving the enum design space (Section 8). normalizeConfig
// guarantees the result is always valid even if a future field is unmappable.
export function heroConfigFromSource(source) {
  const base = defaultHeroConfig();
  const path = String(source?.page?.path ?? "").toLowerCase();

  // A static index.html homepage tends to be center-aligned; an app/component
  // hero tends to be left-aligned. These only ever pick allowed enum options.
  if (/\.html?$/.test(path)) {
    base.layout = "center";
  } else if (/hero\./.test(path)) {
    base.layout = "left";
  }

  return normalizeConfig(base);
}

export function normalizeConfig(raw) {
  const out = {};
  for (const key of HERO_ATTRIBUTES) {
    const spec = HERO_DESIGN_SPACE[key];
    const val = raw?.[key];
    out[key] = spec.options.includes(val) ? val : spec.default;
  }
  return out;
}

// Is `config` entirely within the enum-constrained design space? Used by the
// challenger validation / injection guard so nothing out-of-space slips through.
export function isValidHeroConfig(raw) {
  if (!raw || typeof raw !== "object") return false;
  return HERO_ATTRIBUTES.every((key) =>
    HERO_DESIGN_SPACE[key].options.includes(raw[key])
  );
}

// --- Hidden "ground truth" ---------------------------------------------------
// The optimizer is, in effect, trying to discover these preferences. They are
// hidden from the UI; only the simulated outcomes reveal them. Each attribute
// option carries a small appeal contribution. (Synthetic — replaced by real
// analytics in the MVP; see FR-B2/FR-D3.)
const HEADLINE_APPEAL = {
  "Build better landing pages, faster": 0.0,
  "Turn visitors into customers": 0.06,
  "Ship a hero that converts": 0.04,
  "Your landing page, optimized by AI": 0.05,
};
const SUBHEAD_APPEAL = {
  "An AB testing copilot for your hero section.": 0.0,
  "Connect your site and let Beagle do the testing.": 0.02,
  "Evidence-based hero optimization, on autopilot.": 0.04,
  "No more guessing which hero converts best.": 0.05,
};
const CTA_LABEL_APPEAL = {
  "Get started": 0.0,
  "Start free trial": 0.05,
  "Book a demo": 0.02,
  "Try Beagle": 0.03,
};
const CTA_STYLE_APPEAL = { solid: 0.05, outline: 0.0, soft: 0.03 };
const LAYOUT_APPEAL = { left: 0.5, center: 0.6, split: 0.55 };
const MEDIA_APPEAL = { none: 0.0, illustration: 0.03, screenshot: 0.06, video: 0.07 };

// Maps a variant config to a hidden "appeal" in roughly [0.4, 0.9].
export function configAppeal(config, generation = 0) {
  const c = normalizeConfig(config);
  const base =
    (LAYOUT_APPEAL[c.layout] ?? 0.45) +
    (HEADLINE_APPEAL[c.headline] ?? 0) +
    (SUBHEAD_APPEAL[c.subheadline] ?? 0) +
    (CTA_LABEL_APPEAL[c.ctaLabel] ?? 0) +
    (CTA_STYLE_APPEAL[c.ctaStyle] ?? 0) +
    (MEDIA_APPEAL[c.media] ?? 0);
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
  const baseTime = 8.5 - appeal * 5.5; // ~3.5s (great) .. ~6.3s (poor)
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
// Demo: returns a mutated hero config + a human rationale. Real version: Claude
// proposes a new hero from the winning variant, the goal, the design system and
// guardrails (see api/propose-challenger.js and src/lib/challenger.js — owned by
// beagle-hypothesis). This stub stays as the offline fallback.
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
  if (p.headline !== ch.headline)
    return `Testing a sharper headline ("${ch.headline}") to lift ${g}.`;
  if (p.subheadline !== ch.subheadline)
    return `Reframing the subheadline to clarify value and improve ${g}.`;
  if (p.ctaLabel !== ch.ctaLabel)
    return `Trying the CTA label "${ch.ctaLabel}" to nudge ${g} higher.`;
  if (p.ctaStyle !== ch.ctaStyle)
    return `Switching the CTA to a ${ch.ctaStyle} style to increase salience for ${g}.`;
  if (p.layout !== ch.layout)
    return `Re-laying the hero to ${ch.layout} alignment to strengthen the scan path for ${g}.`;
  if (p.media !== ch.media)
    return ch.media === "none"
      ? `Removing supporting media to declutter the hero and focus ${g}.`
      : `Adding ${ch.media} as supporting media to reinforce the offer and lift ${g}.`;
  return `Iterating on the reigning champion hero to keep nudging ${g} upward.`;
}

// Mutation pool: change exactly ONE attribute so lineage reads sensibly.
function mutateConfig(config, history, goal) {
  const base = normalizeConfig(config);
  const seen = new Set((history ?? []).flatMap((r) => r.configKeys ?? []));
  seen.add(configKey(base));

  const candidates = [];
  for (const key of HERO_ATTRIBUTES) {
    for (const option of HERO_DESIGN_SPACE[key].options) {
      if (option !== base[key]) candidates.push({ ...base, [key]: option });
    }
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
  return HERO_ATTRIBUTES.map((k) => `${k}=${c[k]}`).join("|");
}

// A short human label describing how a challenger differs from its parent.
export function describeMutation(parent, child) {
  const p = normalizeConfig(parent);
  const ch = normalizeConfig(child);
  if (!parent) return "Initial control";
  const diffs = [];
  for (const key of HERO_ATTRIBUTES) {
    if (p[key] !== ch[key]) diffs.push(`${key} -> ${ch[key]}`);
  }
  return diffs.length ? diffs.join(", ") : "no change";
}

export { uid, METRICS };
