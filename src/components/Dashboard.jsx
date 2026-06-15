import VariantCard, { SourceBadge } from "./VariantCard.jsx";
import ControlBar from "./ControlBar.jsx";
import GenerationModeToggle from "./GenerationModeToggle.jsx";

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
    simulate,
    fastForward,
    decide,
    clearDecision,
    generationMode,
    setGenerationMode,
    aiAvailable,
  } = exp;

  const champion = variantViews.find((v) => v.isControl) ?? variantViews[0];
  const challenger = variantViews.find((v) => !v.isControl) ?? variantViews[1];
  const canDecide = totalVisitors > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-ink">
              Generation {experiment.currentGeneration}
            </h2>
            <span className="rounded-md border border-edge bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
              {auto?.isPlaying ? "Autoplay on" : "In progress"}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            Goal: {metric.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <GenerationModeToggle
            mode={generationMode}
            setMode={setGenerationMode}
            aiAvailable={aiAvailable}
          />
          <ConfidenceMeter confidence={confidence} hasTraffic={totalVisitors > 0} />
        </div>
      </div>

      <ImprovementStrip improvement={improvement} metric={metric} />

      {lastDecision && (
        <DecisionBanner decision={lastDecision} onDismiss={clearDecision} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
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
    </div>
  );
}

function ImprovementStrip({ improvement, metric }) {
  if (!improvement) {
    return (
      <div className="rounded-lg border border-dashed border-edge bg-surface-2 px-4 py-3 text-center text-xs text-muted">
        Complete a round to establish the generation-1 baseline.
      </div>
    );
  }
  const { pct, baseline, latest, generations, better } = improvement;
  return (
    <div className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-4">
      <div className="flex items-baseline gap-3">
        <span className={`text-2xl font-semibold tabular-nums ${better ? "text-win" : "text-lose"}`}>
          {better ? "+" : ""}
          {pct.toFixed(1)}%
        </span>
        <div className="leading-tight">
          <div className="text-sm font-medium text-ink">
            {metric.short} {better ? "improved" : "changed"} since launch
          </div>
          <div className="text-xs text-muted">
            {generations} generation{generations === 1 ? "" : "s"}, fully automated
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="rounded-md border border-edge bg-surface-2 px-2 py-1">
          G1 {metric.format(baseline)}
        </span>
        <span>→</span>
        <span className="rounded-md border border-edge bg-surface-2 px-2 py-1 font-medium text-win">
          {metric.format(latest)}
        </span>
      </div>
    </div>
  );
}

function ConfidenceMeter({ confidence, hasTraffic }) {
  const pct = Math.round(confidence * 100);
  const strong = confidence >= 0.95;

  return (
    <div className="w-48 rounded-lg border border-edge bg-surface px-3 py-2.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-muted">Confidence</span>
        <span className="font-semibold tabular-nums text-ink">
          {hasTraffic ? `${pct}%` : "—"}
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${hasTraffic ? pct : 0}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted">
        {strong ? "Strong signal" : "Approximate — not rigorous"}
      </p>
    </div>
  );
}

function DecisionBanner({ decision, onDismiss }) {
  return (
    <div className="animate-pop flex flex-wrap items-center justify-between gap-3 rounded-xl border border-edge bg-surface-2 px-4 py-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          Generation {decision.generation}: {decision.winnerLabel} won
          <SourceBadge source={decision.source} />
        </div>
        <div className="mt-0.5 text-[12px] text-muted">
          Next challenger — {decision.mutation}
          {decision.rationale && `. ${decision.rationale}`}
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="rounded-md border border-edge bg-surface px-3 py-1 text-xs text-muted hover:text-ink"
      >
        Dismiss
      </button>
    </div>
  );
}
