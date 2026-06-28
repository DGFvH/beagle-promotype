import {
  BarChart3,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Wand2,
  XCircle,
} from "lucide-react";
import VariantCard, { SourceBadge } from "./VariantCard.jsx";
import ControlBar from "./ControlBar.jsx";
import GenerationModeToggle from "./GenerationModeToggle.jsx";
import LoopToggle from "./LoopToggle.jsx";
import TokenPanel from "./TokenPanel.jsx";
import ReportButton from "./ReportButton.jsx";
import { hypothesisVerdict } from "../lib/analysis.js";

export default function Dashboard({ exp, auto, busy }) {
  const {
    experiment,
    metric,
    variantViews,
    confidence,
    totalVisitors,
    roundProgress,
    roundTarget,
    lastDecision,
    challengerMeta,
    improvement,
    history,
    simulate,
    fastForward,
    decide,
    clearDecision,
    generationMode,
    setGenerationMode,
    aiAvailable,
    variants,
    stats,
    loopEnabled,
    setLoopEnabled,
    tokenTotals,
    tokenByRun,
    segmentAnalysis,
  } = exp;

  const champion = variantViews.find((v) => v.isControl) ?? variantViews[0];
  const challenger = variantViews.find((v) => !v.isControl) ?? variantViews[1];
  const canDecide = totalVisitors > 0;
  const roundFull = roundProgress >= 1;

  // FR-G1 (b): the confirm/reject decision, computed from the measured data
  // (direction-aware via the metric model). Shown with the numbers behind it.
  const verdict =
    variants && variants.length >= 2 && totalVisitors > 0
      ? hypothesisVerdict(metric.id, variants, stats)
      : null;

  return (
    <div className="demo-screen space-y-3">
      <DemoHeader
        experiment={experiment}
        metric={metric}
        history={history}
        improvement={improvement}
        roundProgress={roundProgress}
        generationMode={generationMode}
        setGenerationMode={setGenerationMode}
        aiAvailable={aiAvailable}
        loopEnabled={loopEnabled}
        setLoopEnabled={setLoopEnabled}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          {/* FR-H1: one view pairing the hero (champion AND challenger)
              previews with the live metric data for the chosen metric. */}
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            <Trophy size={13} />
            Hero + {metric.short} data
          </div>
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
          {champion && (
            <VariantCard view={champion} metric={metric} isChallenger={false} />
          )}
          {challenger && (
            <VariantCard
              view={challenger}
              metric={metric}
              isChallenger
              meta={challengerMeta}
            />
          )}
          </div>
        </div>

        <aside className="space-y-3">
          <RoundPanel
            metric={metric}
            confidence={confidence}
            totalVisitors={totalVisitors}
            roundProgress={roundProgress}
            roundTarget={roundTarget}
            roundFull={roundFull}
            isPlaying={auto?.isPlaying}
            lastDecision={lastDecision}
            onDismissDecision={clearDecision}
          />

          {verdict && <VerdictPanel verdict={verdict} metric={metric} />}

          <ControlBar
            onSimulate={simulate}
            onFastForward={fastForward}
            onDecide={decide}
            roundProgress={roundProgress}
            totalVisitors={totalVisitors}
            roundTarget={roundTarget}
            canDecide={canDecide}
            busy={busy}
            isPlaying={auto?.isPlaying}
            onTogglePlay={auto?.toggle}
            speed={auto?.speed}
            setSpeed={auto?.setSpeed}
          />

          {/* FR-G3: trigger a Claude-backed .pptx report once a test concludes. */}
          <ReportButton
            verdict={verdict}
            metric={metric}
            segmentAnalysis={segmentAnalysis}
            hypothesis={challengerMeta?.hypothesis}
          />

          {/* FR-E1: internal token-spend panel (running total + per-run). */}
          <TokenPanel totals={tokenTotals} byRun={tokenByRun} />
        </aside>
      </div>
    </div>
  );
}

function DemoHeader({
  experiment,
  metric,
  history,
  improvement,
  roundProgress,
  generationMode,
  setGenerationMode,
  aiAvailable,
  loopEnabled,
  setLoopEnabled,
}) {
  return (
    <section className="rounded-lg border border-edge bg-surface p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-md border border-accent/20 bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent">
            <BarChart3 size={13} />
            Live demo
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-2xl font-semibold leading-none text-ink">
              Generation {experiment.currentGeneration}
            </h2>
            <span className="text-sm text-muted">{metric.label}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {improvement && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-win/25 bg-win/10 px-2.5 py-1 text-sm font-semibold tabular-nums text-win">
              <TrendingUp size={14} />
              +{improvement.pct.toFixed(1)}%
            </span>
          )}
          <LoopToggle
            compact
            enabled={loopEnabled}
            setEnabled={setLoopEnabled}
          />
          <GenerationModeToggle
            compact
            mode={generationMode}
            setMode={setGenerationMode}
            aiAvailable={aiAvailable}
          />
        </div>
      </div>

      <GenerationRail
        history={history}
        metric={metric}
        currentGeneration={experiment.currentGeneration}
        roundProgress={roundProgress}
      />
    </section>
  );
}

function GenerationRail({ history, metric, currentGeneration, roundProgress }) {
  const complete = history.map((round) => ({
    generation: round.generation,
    value: metric.toChart(round.winnerValue),
    label: metric.format(round.winnerValue),
    active: false,
  }));
  const values = complete.map((item) => item.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = Math.max(0.01, max - min);
  const items = [
    ...complete,
    {
      generation: currentGeneration,
      value: null,
      label: `${Math.round(roundProgress * 100)}%`,
      active: true,
    },
  ];

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted">
        <GitBranch size={13} />
        Iterations over time
      </div>
      <ol
        className="grid items-end gap-1.5"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const normalized =
            item.value == null ? roundProgress : (item.value - min) / range;
          const height = item.active ? 18 + roundProgress * 28 : 14 + normalized * 30;
          return (
            <li key={`${item.generation}-${item.active ? "live" : "done"}`} className="min-w-0">
              <div
                className={`flex h-12 items-end rounded-md border px-1.5 py-1 ${
                  item.active
                    ? "border-accent/40 bg-accent/10"
                    : "border-edge bg-surface-2"
                }`}
                title={`Generation ${item.generation}: ${item.label}`}
              >
                <span
                  className={`w-full rounded-sm ${
                    item.active ? "bg-accent" : "bg-win/70"
                  }`}
                  style={{ height: `${height}px` }}
                />
              </div>
              <div className="mt-1 truncate text-center text-[10px] font-semibold text-muted">
                G{item.generation}
              </div>
              <div
                className={`truncate text-center text-[10px] tabular-nums ${
                  item.active ? "font-semibold text-accent" : "text-muted"
                }`}
              >
                {item.label}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RoundPanel({
  metric,
  confidence,
  totalVisitors,
  roundProgress,
  roundTarget,
  roundFull,
  isPlaying,
  lastDecision,
  onDismissDecision,
}) {
  const pct = Math.round(roundProgress * 100);
  const confidencePct = Math.round(confidence * 100);

  return (
    <section className="rounded-lg border border-edge bg-surface p-3 shadow-sm">
      {lastDecision ? (
        <DecisionBanner decision={lastDecision} onDismiss={onDismissDecision} />
      ) : (
        <>
          <div className="flex items-start gap-2">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
                roundFull ? "bg-accent text-white" : "bg-surface-2 text-muted"
              }`}
            >
              {roundFull ? <CheckCircle2 size={17} /> : <Wand2 size={17} />}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-ink">
                {roundFull ? "Ready to evolve" : "Round in progress"}
              </h3>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">
                {roundFull
                  ? "Call the winner and create the next generation."
                  : isPlaying
                    ? "1x autoplay is adding visitors steadily."
                    : "Start autoplay to watch this fill."}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <PanelStat label="Visitors" value={`${totalVisitors}/${roundTarget}`} />
            <PanelStat label={metric.short} value={`${confidencePct}% conf`} />
          </div>

          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-muted">
              <span>Window progress</span>
              <span className="font-semibold tabular-nums text-ink">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// FR-G1 (b): live confirm/reject of the challenger hypothesis with the numbers
// behind it. The confidence figure is the engine's ROUGH indicator (Section 8) —
// surfaced labelled as such, never as a production p-value.
function VerdictPanel({ verdict, metric }) {
  const fmt = (v) => (v == null ? "--" : metric.format(v));
  const tone =
    verdict.verdict === "confirmed"
      ? { box: "border-win/30 bg-win/10", text: "text-win", Icon: ShieldCheck, label: "Hypothesis confirmed" }
      : verdict.verdict === "rejected"
        ? { box: "border-lose/30 bg-lose/10", text: "text-lose", Icon: XCircle, label: "Hypothesis rejected" }
        : { box: "border-edge bg-surface-2", text: "text-muted", Icon: Wand2, label: "Inconclusive so far" };
  const { Icon } = tone;

  return (
    <section className={`rounded-lg border p-3 shadow-sm ${tone.box}`}>
      <div className="flex items-start gap-2">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface ${tone.text}`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <h3 className={`text-sm font-semibold ${tone.text}`}>{tone.label}</h3>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">{verdict.reason}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <PanelStat label={`${verdict.championLabel} ${metric.short}`} value={fmt(verdict.championValue)} />
        <PanelStat label={`${verdict.challengerLabel} ${metric.short}`} value={fmt(verdict.challengerValue)} />
      </div>
      <p className="mt-2 text-[10px] leading-snug text-muted">
        {verdict.confidence.pct}% confidence — {verdict.confidence.label}.
      </p>
    </section>
  );
}

function PanelStat({ label, value }) {
  return (
    <div className="rounded-md border border-edge bg-surface-2 px-2.5 py-2">
      <div className="text-[10px] font-medium text-muted">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold tabular-nums text-ink">
        {value}
      </div>
    </div>
  );
}

function DecisionBanner({ decision, onDismiss }) {
  return (
    <div className="animate-pop">
      <div className="flex items-start gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-win text-white">
          <Trophy size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink">
            G{decision.generation}: {decision.winnerLabel} won
            <SourceBadge source={decision.source} />
          </div>
          <p className="mt-1 text-[12px] leading-snug text-muted">
            Next: {decision.mutation}
            {decision.rationale && `. ${decision.rationale}`}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 w-full rounded-md border border-edge bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
      >
        Dismiss
      </button>
    </div>
  );
}
