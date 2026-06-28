import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { loadCurrentHero } from "../lib/engine.js";
import { setConnectedSource } from "../lib/sources/store.js";
import {
  createApprovalGate,
  approve as approveGate,
  reject as rejectGate,
  goLive as goLiveGate,
  isLive as gateIsLive,
} from "../lib/approval.js";

const CONTROL_CONFIG = DEFAULT_CONFIG;

// Number of visitors that "fills" a round window. Real product: a day/week of
// real traffic; here it's just a sample-size target for the demo.
export const ROUND_TARGET = 600;

export function useExperiment() {
  const [experiment, setExperiment] = useState({
    id: "exp_demo",
    name: "Homepage hero",
    goalMetric: "ctr",
    status: "setup", // 'setup' | 'running' | 'decided'
    currentGeneration: 1,
  });

  // FR-A1/FR-A3 — the connected source reference (NO secret) + located hero
  // baseline. `null` until the user connects a source and passes the page check.
  // The seeded demo (startSeeded) does NOT set this, so it is unaffected.
  const [connectedSource, setConnectedSourceState] = useState(null);
  const [currentHero, setCurrentHero] = useState(null);

  const [variants, setVariants] = useState([]); // current round's two variants
  const [stats, setStats] = useState({}); // variantId -> accumulator
  const [history, setHistory] = useState([]); // completed rounds
  const [lastDecision, setLastDecision] = useState(null); // transient highlight
  const [challengerMeta, setChallengerMeta] = useState(null); // rationale/source of current challenger

  // FR-D1 — explicit approval gate. A proposed challenger sits in this gate
  // until the user approves; only then does the go-live seam (FR-D2/D3) run.
  // `null` means no pending proposal (e.g. seeded demo, already-live state).
  const [approvalGate, setApprovalGate] = useState(null);
  // The injection + experiment-creation seam beagle-integrations fills for
  // FR-D2/D3. Default: a safe local "go live" that flips the experiment to
  // running. Replace via setGoLiveSeam without touching the gate logic.
  //   seam({ proposal }) -> experimentRecord | Promise<experimentRecord>
  const goLiveSeamRef = useRef(null);

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

      // FR-A2: if a real page was connected (FR-A1), use its located hero as the
      // champion baseline; otherwise the demo fixture. loadCurrentHero already
      // normalised the config, so it is always a valid hero.
      const baselineConfig = currentHero?.config ?? { ...CONTROL_CONFIG };
      const control = makeVariant({
        experimentId: experiment.id,
        generation: 1,
        label: "Champion",
        config: baselineConfig,
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

      // FR-D1: do NOT go live here. The proposed challenger is parked in an
      // approval gate; nothing is injected and no experiment runs until the
      // user explicitly approves (Section 8: human-approved only).
      setExperiment((e) => ({
        ...e,
        name,
        goalMetric: metric,
        status: "awaiting_approval",
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
      setApprovalGate(
        createApprovalGate({
          proposal: {
            champion: control,
            challenger,
            goalMetric: metric,
            rationale: proposal.rationale,
            source: proposal.source,
            // TODO(beagle-hypothesis, FR-C1): real one-paragraph hypothesis.
            hypothesis: proposal.hypothesis ?? null,
          },
        })
      );
    },
    [experiment.id, experiment.name, experiment.goalMetric, generationMode, currentHero]
  );

  // FR-A1/FR-A3 — record the connected source reference (after the user passes
  // the page check) and load the located page as the champion baseline (FR-A2
  // seam via loadCurrentHero). Stores only the sanitized reference (no secret).
  const connect = useCallback((source) => {
    setConnectedSource(source); // persist the reference in the source store
    setConnectedSourceState(source);
    const hero = loadCurrentHero({ source });
    setCurrentHero(hero);
    return hero;
  }, []);

  // FR-D1/D2/D3 seam setter: integrations swap in the real injection +
  // experiment-creation callback. Until then, the default below is used.
  const setGoLiveSeam = useCallback((seam) => {
    goLiveSeamRef.current = typeof seam === "function" ? seam : null;
  }, []);

  // Default go-live behaviour for the MVP shell: flip the experiment to
  // "running" so the existing test→measure→decide loop takes over. The real
  // FR-D2 (cookie injection) + FR-D3 (experiment creation/readout) replace this
  // via setGoLiveSeam — they return the experiment record this records.
  const defaultGoLive = useCallback(({ proposal }) => {
    setExperiment((e) => ({ ...e, status: "running" }));
    return {
      id: `exp_${Date.now()}`,
      goalMetric: proposal?.goalMetric ?? null,
      // TODO(beagle-integrations, FR-D2/D3): real injection handle + analytics
      // experiment id land here.
      injection: { status: "stub", note: "local go-live; no real injection yet" },
      createdAt: Date.now(),
    };
  }, []);

  // Approve the pending proposal — the ONLY path that triggers go-live.
  const approve = useCallback(async () => {
    let approved = null;
    setApprovalGate((g) => {
      approved = approveGate(g);
      return approved;
    });
    if (!approved) return { ok: false, reason: "no pending proposal" };
    const seam = goLiveSeamRef.current ?? defaultGoLive;
    const res = await goLiveGate(approved, seam);
    if (res.ok) setApprovalGate(res.gate);
    return res;
  }, [defaultGoLive]);

  // Reject the pending proposal — nothing is injected, no experiment created.
  const rejectProposal = useCallback((reason = null) => {
    setApprovalGate((g) => rejectGate(g, reason));
  }, []);

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
    // Seeded demo represents an already-running experiment — no pending gate.
    setApprovalGate(null);
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
    setApprovalGate(null);
    setConnectedSourceState(null);
    setCurrentHero(null);
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
    // FR-A1/FR-A3 connected source + located hero baseline
    connectedSource,
    currentHero,
    connect,
    // generation mode
    generationMode,
    setGenerationMode,
    aiAvailable,
    // FR-D1 approval gate
    approvalGate,
    approvalState: approvalGate?.state ?? null,
    isLive: gateIsLive(approvalGate),
    setGoLiveSeam, // FR-D2/D3 injection point for beagle-integrations
    approve,
    rejectProposal,
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
