import { normalizeConfig } from "./engine.js";

export { normalizeConfig };

// Default navigation variant shape - every config is normalized to this.
export const DEFAULT_CONFIG = {
  align: "left",
  weight: "normal",
  icon: false,
  spacing: "compact",
  navStyle: "plain",
};

// Curated rounds: each uses visually distinct champion vs challenger configs.
// Metrics trend upward so the lineage chart tells a clear story out of the box.
const SEED_SCRIPT = [
  {
    champion: { align: "left", weight: "normal", icon: false, spacing: "compact", navStyle: "plain" },
    challenger: { align: "center", weight: "normal", icon: false, spacing: "comfortable", navStyle: "plain" },
    championValue: 0.38,
    challengerValue: 0.46,
    winnerIsChallenger: true,
    mutation: "align -> center",
    rationale: "Centered navigation tested to improve scan path for first-time visitors.",
  },
  {
    champion: { align: "center", weight: "normal", icon: false, spacing: "comfortable", navStyle: "plain" },
    challenger: { align: "center", weight: "bold", icon: false, spacing: "comfortable", navStyle: "plain" },
    championValue: 0.46,
    challengerValue: 0.52,
    winnerIsChallenger: true,
    mutation: "weight -> bold",
    rationale: "Bolder labels to increase salience without changing layout.",
  },
  {
    champion: { align: "center", weight: "bold", icon: false, spacing: "comfortable", navStyle: "plain" },
    challenger: { align: "center", weight: "bold", icon: true, spacing: "comfortable", navStyle: "plain" },
    championValue: 0.52,
    challengerValue: 0.57,
    winnerIsChallenger: true,
    mutation: "added icons",
    rationale: "Leading icons added to speed up menu item recognition.",
  },
  {
    champion: { align: "center", weight: "bold", icon: true, spacing: "comfortable", navStyle: "plain" },
    challenger: { align: "center", weight: "bold", icon: true, spacing: "comfortable", navStyle: "pills" },
    championValue: 0.57,
    challengerValue: 0.61,
    winnerIsChallenger: true,
    mutation: "navStyle -> pills",
    rationale: "Pill-shaped nav items to clarify click targets.",
  },
  {
    champion: { align: "center", weight: "bold", icon: true, spacing: "comfortable", navStyle: "pills" },
    challenger: { align: "center", weight: "bold", icon: true, spacing: "loose", navStyle: "pills" },
    championValue: 0.61,
    challengerValue: 0.64,
    winnerIsChallenger: true,
    mutation: "spacing -> loose",
    rationale: "More breathing room between items to reduce mis-clicks.",
  },
  {
    champion: { align: "center", weight: "bold", icon: true, spacing: "loose", navStyle: "pills" },
    challenger: { align: "center", weight: "bold", icon: true, spacing: "loose", navStyle: "underline" },
    championValue: 0.64,
    challengerValue: 0.67,
    winnerIsChallenger: true,
    mutation: "navStyle -> underline",
    rationale: "Underline affordance tested against filled pills.",
  },
  {
    champion: { align: "center", weight: "bold", icon: true, spacing: "loose", navStyle: "underline" },
    challenger: { align: "right", weight: "bold", icon: true, spacing: "loose", navStyle: "underline" },
    championValue: 0.67,
    challengerValue: 0.63,
    winnerIsChallenger: false,
    mutation: "align -> right",
    rationale: "Right alignment probed; center retained as stronger for this audience.",
  },
  {
    champion: { align: "center", weight: "bold", icon: true, spacing: "loose", navStyle: "underline" },
    challenger: { align: "center", weight: "normal", icon: true, spacing: "loose", navStyle: "underline" },
    championValue: 0.67,
    challengerValue: 0.69,
    winnerIsChallenger: true,
    mutation: "weight -> normal",
    rationale: "Slightly lighter weight reduced visual noise while keeping icons.",
  },
];

// Generation currently in progress (gen 9): champion vs a fresh challenger.
const CURRENT_ROUND = {
  generation: 9,
  champion: { align: "center", weight: "normal", icon: true, spacing: "loose", navStyle: "underline" },
  challenger: { align: "center", weight: "bold", icon: true, spacing: "comfortable", navStyle: "pills" },
  rationale: "Re-testing bold pills with tighter spacing against the reigning underline style.",
  source: "simulated",
  // Starts early enough for 1x autoplay to make the live round visibly progress.
  championStats: { visitors: 95, clicks: 69, converts: 37, times: [] },
  challengerStats: { visitors: 95, clicks: 62, converts: 33, times: [] },
};

// Gallery shown on setup - a spread of distinct configs from the seed lineage.
export const VARIANT_GALLERY = [
  { label: "G1 control", config: SEED_SCRIPT[0].champion },
  { label: "G1 challenger", config: SEED_SCRIPT[0].challenger },
  { label: "G3 + icons", config: SEED_SCRIPT[2].challenger },
  { label: "G4 pills", config: SEED_SCRIPT[3].challenger },
  { label: "G6 underline", config: SEED_SCRIPT[5].challenger },
  { label: "G8 champion", config: SEED_SCRIPT[7].champion },
  { label: "G9 challenger", config: CURRENT_ROUND.challenger },
  { label: "Right align", config: { align: "right", weight: "bold", icon: false, spacing: "compact", navStyle: "plain" } },
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
    const loserCfg = row.winnerIsChallenger ? champCfg : challCfg;
    const winnerValue = row.winnerIsChallenger ? row.challengerValue : row.championValue;
    const loserValue = row.winnerIsChallenger ? row.championValue : row.challengerValue;
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
