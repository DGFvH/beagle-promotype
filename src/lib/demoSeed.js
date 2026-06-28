import { normalizeConfig, defaultHeroConfig } from "./engine.js";

export { normalizeConfig };

// Default hero variant shape — the champion baseline (FR-A2). Every config is
// normalized to the enum-constrained HERO_DESIGN_SPACE. This is the same fixture
// loadCurrentHero() returns until the real source connector (FR-A1) is wired.
export const DEFAULT_CONFIG = defaultHeroConfig();

// Curated rounds: each uses visually/semantically distinct champion vs
// challenger hero configs. Metrics trend upward so the lineage chart tells a
// clear story out of the box. Each step changes exactly one hero attribute.
const SEED_SCRIPT = [
  {
    champion: {
      headline: "Build better landing pages, faster",
      subheadline: "An AB testing copilot for your hero section.",
      ctaLabel: "Get started",
      ctaStyle: "solid",
      layout: "left",
      media: "none",
    },
    challenger: {
      headline: "Build better landing pages, faster",
      subheadline: "An AB testing copilot for your hero section.",
      ctaLabel: "Get started",
      ctaStyle: "solid",
      layout: "center",
      media: "none",
    },
    championValue: 0.38,
    challengerValue: 0.46,
    winnerIsChallenger: true,
    mutation: "layout -> center",
    rationale: "Centered hero tested to focus the scan path for first-time visitors.",
  },
  {
    champion: {
      headline: "Build better landing pages, faster",
      subheadline: "An AB testing copilot for your hero section.",
      ctaLabel: "Get started",
      ctaStyle: "solid",
      layout: "center",
      media: "none",
    },
    challenger: {
      headline: "Turn visitors into customers",
      subheadline: "An AB testing copilot for your hero section.",
      ctaLabel: "Get started",
      ctaStyle: "solid",
      layout: "center",
      media: "none",
    },
    championValue: 0.46,
    challengerValue: 0.52,
    winnerIsChallenger: true,
    mutation: "headline -> Turn visitors into customers",
    rationale: "Outcome-led headline to sharpen the value proposition.",
  },
  {
    champion: {
      headline: "Turn visitors into customers",
      subheadline: "An AB testing copilot for your hero section.",
      ctaLabel: "Get started",
      ctaStyle: "solid",
      layout: "center",
      media: "none",
    },
    challenger: {
      headline: "Turn visitors into customers",
      subheadline: "An AB testing copilot for your hero section.",
      ctaLabel: "Get started",
      ctaStyle: "solid",
      layout: "center",
      media: "screenshot",
    },
    championValue: 0.52,
    challengerValue: 0.57,
    winnerIsChallenger: true,
    mutation: "media -> screenshot",
    rationale: "Product screenshot added to make the offer concrete.",
  },
  {
    champion: {
      headline: "Turn visitors into customers",
      subheadline: "An AB testing copilot for your hero section.",
      ctaLabel: "Get started",
      ctaStyle: "solid",
      layout: "center",
      media: "screenshot",
    },
    challenger: {
      headline: "Turn visitors into customers",
      subheadline: "An AB testing copilot for your hero section.",
      ctaLabel: "Start free trial",
      ctaStyle: "solid",
      layout: "center",
      media: "screenshot",
    },
    championValue: 0.57,
    challengerValue: 0.61,
    winnerIsChallenger: true,
    mutation: "ctaLabel -> Start free trial",
    rationale: "Lower-friction CTA label tested to clarify the next step.",
  },
  {
    champion: {
      headline: "Turn visitors into customers",
      subheadline: "An AB testing copilot for your hero section.",
      ctaLabel: "Start free trial",
      ctaStyle: "solid",
      layout: "center",
      media: "screenshot",
    },
    challenger: {
      headline: "Turn visitors into customers",
      subheadline: "Evidence-based hero optimization, on autopilot.",
      ctaLabel: "Start free trial",
      ctaStyle: "solid",
      layout: "center",
      media: "screenshot",
    },
    championValue: 0.61,
    challengerValue: 0.64,
    winnerIsChallenger: true,
    mutation: "subheadline -> Evidence-based hero optimization, on autopilot.",
    rationale: "Subheadline reframed around evidence to reinforce trust.",
  },
  {
    champion: {
      headline: "Turn visitors into customers",
      subheadline: "Evidence-based hero optimization, on autopilot.",
      ctaLabel: "Start free trial",
      ctaStyle: "solid",
      layout: "center",
      media: "screenshot",
    },
    challenger: {
      headline: "Turn visitors into customers",
      subheadline: "Evidence-based hero optimization, on autopilot.",
      ctaLabel: "Start free trial",
      ctaStyle: "solid",
      layout: "center",
      media: "video",
    },
    championValue: 0.64,
    challengerValue: 0.67,
    winnerIsChallenger: true,
    mutation: "media -> video",
    rationale: "Short product video tested against the static screenshot.",
  },
  {
    champion: {
      headline: "Turn visitors into customers",
      subheadline: "Evidence-based hero optimization, on autopilot.",
      ctaLabel: "Start free trial",
      ctaStyle: "solid",
      layout: "center",
      media: "video",
    },
    challenger: {
      headline: "Turn visitors into customers",
      subheadline: "Evidence-based hero optimization, on autopilot.",
      ctaLabel: "Start free trial",
      ctaStyle: "outline",
      layout: "center",
      media: "video",
    },
    championValue: 0.67,
    challengerValue: 0.63,
    winnerIsChallenger: false,
    mutation: "ctaStyle -> outline",
    rationale: "Outline CTA probed; solid retained as stronger for this audience.",
  },
  {
    champion: {
      headline: "Turn visitors into customers",
      subheadline: "Evidence-based hero optimization, on autopilot.",
      ctaLabel: "Start free trial",
      ctaStyle: "solid",
      layout: "center",
      media: "video",
    },
    challenger: {
      headline: "Turn visitors into customers",
      subheadline: "Evidence-based hero optimization, on autopilot.",
      ctaLabel: "Start free trial",
      ctaStyle: "solid",
      layout: "split",
      media: "video",
    },
    championValue: 0.67,
    challengerValue: 0.69,
    winnerIsChallenger: true,
    mutation: "layout -> split",
    rationale: "Split layout placed copy and media side by side to balance attention.",
  },
];

// Generation currently in progress (gen 9): champion vs a fresh challenger.
const CURRENT_ROUND = {
  generation: 9,
  champion: {
    headline: "Turn visitors into customers",
    subheadline: "Evidence-based hero optimization, on autopilot.",
    ctaLabel: "Start free trial",
    ctaStyle: "solid",
    layout: "split",
    media: "video",
  },
  challenger: {
    headline: "Ship a hero that converts",
    subheadline: "Evidence-based hero optimization, on autopilot.",
    ctaLabel: "Start free trial",
    ctaStyle: "soft",
    layout: "split",
    media: "video",
  },
  rationale: "Re-testing a punchier headline and a soft CTA against the reigning split hero.",
  source: "simulated",
  // Starts early enough for 1x autoplay to make the live round visibly progress.
  championStats: { visitors: 95, clicks: 69, converts: 37, times: [] },
  challengerStats: { visitors: 95, clicks: 62, converts: 33, times: [] },
};

// Gallery shown on setup - a spread of distinct hero configs from the lineage.
export const VARIANT_GALLERY = [
  { label: "G1 control", config: SEED_SCRIPT[0].champion },
  { label: "G1 challenger", config: SEED_SCRIPT[0].challenger },
  { label: "G3 + screenshot", config: SEED_SCRIPT[2].challenger },
  { label: "G4 trial CTA", config: SEED_SCRIPT[3].challenger },
  { label: "G6 video", config: SEED_SCRIPT[5].challenger },
  { label: "G8 champion", config: SEED_SCRIPT[7].champion },
  { label: "G9 challenger", config: CURRENT_ROUND.challenger },
  {
    label: "Outline CTA",
    config: {
      headline: "Your landing page, optimized by AI",
      subheadline: "No more guessing which hero converts best.",
      ctaLabel: "Book a demo",
      ctaStyle: "outline",
      layout: "left",
      media: "illustration",
    },
  },
];

/** G1 vs G8 configs for the landing hero before/after visual. */
export const HERO_EVOLUTION = {
  before: { generation: 1, config: SEED_SCRIPT[0].champion, metricLabel: "38% CTR" },
  after: { generation: 8, config: SEED_SCRIPT[7].challenger, metricLabel: "69% CTR" },
  delta: "+81%",
};

/**
 * Build a fully populated experiment state for the demo.
 * @param {object} opts
 * @param {string} opts.experimentId
 * @param {string} opts.name
 * @param {string} opts.goalMetric
 * @param {typeof import('./engine.js').makeVariant} makeVariant
 * @param {typeof import('./engine.js').configKey} configKey
 */
export function buildDemoState({ experimentId, name, goalMetric, makeVariant, configKey }) {
  const history = SEED_SCRIPT.map((row, i) => {
    const gen = i + 1;
    const champCfg = normalizeConfig(row.champion);
    const challCfg = normalizeConfig(row.challenger);
    const winnerCfg = row.winnerIsChallenger ? challCfg : champCfg;
    const winnerValue = row.winnerIsChallenger ? row.challengerValue : row.championValue;
    const visitors = 600;

    const championId = `seed_c_${gen}`;
    const challengerId = `seed_b_${gen}`;

    return {
      generation: gen,
      goalMetric,
      window: visitors,
      confidence: 0.88 + i * 0.01,
      winnerVariantId: row.winnerIsChallenger ? challengerId : championId,
      winnerConfig: winnerCfg,
      winnerValue,
      configKeys: [configKey(champCfg), configKey(challCfg)],
      challengerConfig: challCfg,
      mutation: row.mutation,
      rationale: row.rationale,
      source: "simulated",
      entries: [
        {
          id: championId,
          label: "Champion",
          config: champCfg,
          isControl: true,
          isWinner: !row.winnerIsChallenger,
          value: row.championValue,
          visitors,
        },
        {
          id: challengerId,
          label: "Challenger",
          config: challCfg,
          isControl: false,
          isWinner: row.winnerIsChallenger,
          value: row.challengerValue,
          visitors,
        },
      ],
    };
  });

  const champCfg = normalizeConfig(CURRENT_ROUND.champion);
  const challCfg = normalizeConfig(CURRENT_ROUND.challenger);

  const champion = makeVariant({
    experimentId,
    generation: CURRENT_ROUND.generation,
    label: "Champion",
    config: champCfg,
    isControl: true,
  });
  const challenger = makeVariant({
    experimentId,
    generation: CURRENT_ROUND.generation,
    label: "Challenger",
    config: challCfg,
    isControl: false,
  });

  return {
    experiment: {
      id: experimentId,
      name,
      goalMetric,
      status: "running",
      currentGeneration: CURRENT_ROUND.generation,
    },
    variants: [champion, challenger],
    stats: {
      [champion.id]: { ...CURRENT_ROUND.championStats, times: [] },
      [challenger.id]: { ...CURRENT_ROUND.challengerStats, times: [] },
    },
    history,
    challengerMeta: {
      rationale: CURRENT_ROUND.rationale,
      source: CURRENT_ROUND.source,
    },
  };
}
