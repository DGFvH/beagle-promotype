import { useCallback, useEffect, useMemo, useState } from "react";
import {
  makeVariant,
  emptyStats,
  simulateVisitors,
  metricValue,
  roundConfidence,
  leadingVariantId,
  configKey,
  describeMutation,
  normalizeConfig,
} from "../lib/engine.js";
import { generateChallenger, probeAiAvailable } from "../lib/challenger.js";
import { METRICS } from "../lib/metrics.js";
import { buildDemoState, DEFAULT_CONFIG } from "../lib/demoSeed.js";

const CONTROL_CONFIG = DEFAULT_CONFIG;

// Number of visitors that "fills" a round window. Real product: a day/week of
// real traffic; here it's just a sample-size target for the demo.
export const ROUND_TARGET = 600;

export function useExperiment() {
  const [experiment, setExperiment] = useState({
    id: "exp_demo",
    name: "Primary navigation menu",
    goalMetric: "ctr",
    status: "setup", // 'setup' | 'running' | 'decided'
    currentGeneration: 1,
  });

  const [variants, setVariants] = useState([]); // current round's two variants
  const [stats, setStats] = useState({}); // variantId -> accumulator
  const [history, setHistory] = useState([]); // completed rounds
  const [lastDecision, setLastDecision] = useState(null); // transient highlight
  const [challengerMeta, setChallengerMeta] = useState(null); // rationale/source of current challenger

  // Generation mode: simulated stub (default) vs real LLM. We also probe
  // whether the AI endpoint is actually wired up so the UI can reflect it.
  const [generationMode, setGenerationMode] = useState("simulated");
  const [aiAvailable, setAiAvailable] = useState(false);

  useEffect(() => {
    let alive = true;
    probeAiAvailable().then((ok) => {
      if (alive) setAiAvailable(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  // --- derived ---------------------------------------------------------------
  const goal = experiment.goalMetric;
  const totalVisitors = useMemo(
    () => variants.reduce((sum, v) => sum + (stats[v.id]?.visitors ?? 0), 0),
    [variants, stats]
  );
  const roundProgress = Math.min(1, totalVisitors / ROUND_TARGET);
  const leaderId = useMemo(
    () => leadingVariantId(goal, variants, stats),
    [goal, variants, stats]
  );
  const confidence = useMemo(
    () => roundConfidence(goal, variants, stats),
    [goal, variants, stats]
  );

  const variantViews = useMemo(
    () =>
      variants.map((v) => ({
        ...v,
        stats: stats[v.id] ?? emptyStats(),
        value: metricValue(goal, stats[v.id] ?? emptyStats()),
        isLeader: v.id === leaderId,
      })),
    [variants, stats, goal, leaderId]
  );

  // Headline "how much better is the site now than at launch" - direction-aware
  // so a positive percentage always means improvement.
  const improvement = useMemo(() => {
    if (history.length < 1) return null;
    const baseline = history[0].winnerValue;
    const latest = history[history.length - 1].winnerValue;
    if (!baseline) return null;
    const dir = METRICS[goal].direction;
    const pct =
      dir === "maximize"
        ? ((latest - baseline) / baseline) * 100
        : ((baseline - latest) / baseline) * 100;
    return {
      baseline,
      latest,
      pct,
      generations: history.length,
      better: pct >= 0,
    };
  }, [history, goal]);

  // --- actions ---------------------------------------------------------------

  const start = useCallback(
    async (config) => {
      const name = config?.name ?? experiment.name;
      const metric = config?.goalMetric ?? experiment.goalMetric;

      const control = makeVariant({
        experimentId: experiment.id,
        generation: 1,
        label: "Champion",
        config: { ...CONTROL_CONFIG },
        isControl: true,
      });
      // First challenger is one mutation away from the control.
      const proposal = await generateChallenger(control, metric, [], generationMode);
      const challenger = makeVariant({
        experimentId: experiment.id,
        generation: 1,
        label: "Challenger",
        config: proposal.config,
        isControl: false,
      });

      setExperiment((e) => ({
        ...e,
        name,
        goalMetric: metric,
        status: "running",
        currentGeneration: 1,
      }));
      setVariants([control, challenger]);
      setStats({ [control.id]: emptyStats(), [challenger.id]: emptyStats() });
      setHistory([]);
      setLastDecision(null);
      setChallengerMeta({
        rationale: proposal.rationale,
        source: proposal.source,
        model: proposal.model,
      });
    },
    [experiment.id, experiment.name, experiment.goalMetric, generationMode]
  );

  const startSeeded = useCallback(async () => {
    const seeded = buildDemoState({
      experimentId: experiment.id,
      name: experiment.name,
      goalMetric: experiment.goalMetric,
      makeVariant,
      configKey,
    });
    setExperiment(seeded.experiment);
    setVariants(seeded.variants);
    setStats(seeded.stats);
    setHistory(seeded.history);
    setLastDecision(null);
    setChallengerMeta(seeded.challengerMeta);
  }, [experiment.id, experiment.name, experiment.goalMetric]);

  const simulate = useCallback(
    (count) => {
      setStats((prev) =>
        simulateVisitors(count, variants, experiment.currentGeneration, prev)
      );
    },
    [variants, experiment.currentGeneration]
  );

  const fastForward = useCallback(() => {
    const remaining = Math.max(0, ROUND_TARGET - totalVisitors);
    if (remaining <= 0) return;
    setStats((prev) =>
      simulateVisitors(remaining, variants, experiment.currentGeneration, prev)
    );
  }, [variants, experiment.currentGeneration, totalVisitors]);

  // Decide the winner, record the round, evolve a new challenger, restart.
  const decide = useCallback(async () => {
    if (variants.length < 2) return;
    const winnerId = leadingVariantId(goal, variants, stats);
    if (!winnerId) return; // no traffic yet
    const winner = variants.find((v) => v.id === winnerId);
    const loser = variants.find((v) => v.id !== winnerId);

    const conf = roundConfidence(goal, variants, stats);
    const gen = experiment.currentGeneration;

    const roundResult = {
      generation: gen,
      goalMetric: goal,
      window: stats[winner.id].visitors + (stats[loser.id]?.visitors ?? 0),
      confidence: conf,
      winnerVariantId: winner.id,
      winnerConfig: { ...winner.config },
      winnerValue: metricValue(goal, stats[winner.id]),
      configKeys: variants.map((v) => configKey(v.config)),
      entries: variants.map((v) => ({
        id: v.id,
        label: v.label,
        config: { ...v.config },
        isControl: v.isControl,
        isWinner: v.id === winner.id,
        value: metricValue(goal, stats[v.id]),
        visitors: stats[v.id]?.visitors ?? 0,
      })),
    };

    // Evolve the next challenger from the winner (the LLM hook / orchestrator).
    const fullHistory = [...history, roundResult];
    const proposal = await generateChallenger(winner, goal, fullHistory, generationMode);
    const challengerConfig = proposal.config;
    roundResult.challengerConfig = challengerConfig;
    roundResult.mutation = describeMutation(winner.config, challengerConfig);
    roundResult.rationale = proposal.rationale;
    roundResult.source = proposal.source;

    const nextGen = gen + 1;
    const champion = makeVariant({
      experimentId: experiment.id,
      generation: nextGen,
      label: "Champion",
      config: { ...winner.config },
      isControl: true,
    });
    const challenger = makeVariant({
      experimentId: experiment.id,
      generation: nextGen,
      label: "Challenger",
      config: challengerConfig,
      isControl: false,
    });

    setHistory(fullHistory);
    setLastDecision({
      generation: gen,
      winnerId: winner.id,
      winnerLabel: winner.label,
      mutation: roundResult.mutation,
      rationale: proposal.rationale,
      source: proposal.source,
    });
    setChallengerMeta({
      rationale: proposal.rationale,
      source: proposal.source,
      model: proposal.model,
    });
    setExperiment((e) => ({ ...e, currentGeneration: nextGen, status: "running" }));
    setVariants([champion, challenger]);
    setStats({ [champion.id]: emptyStats(), [challenger.id]: emptyStats() });
  }, [variants, stats, goal, history, experiment.currentGeneration, experiment.id, generationMode]);

  const reset = useCallback(() => {
    setExperiment((e) => ({ ...e, status: "setup", currentGeneration: 1 }));
    setVariants([]);
    setStats({});
    setHistory([]);
    setLastDecision(null);
    setChallengerMeta(null);
  }, []);

  const setGoalMetric = useCallback((metricId) => {
    setExperiment((e) => ({ ...e, goalMetric: metricId }));
  }, []);

  const setName = useCallback((name) => {
    setExperiment((e) => ({ ...e, name }));
  }, []);

  return {
    experiment,
    metric: METRICS[goal],
    variants,
    variantViews,
    stats,
    history,
    lastDecision,
    challengerMeta,
    improvement,
    totalVisitors,
    roundProgress,
    roundTarget: ROUND_TARGET,
    leaderId,
    confidence,
    // generation mode
    generationMode,
    setGenerationMode,
    aiAvailable,
    // actions
    start,
    startSeeded,
    simulate,
    fastForward,
    decide,
    reset,
    setGoalMetric,
    setName,
    clearDecision: () => setLastDecision(null),
  };
}
