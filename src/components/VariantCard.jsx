import MenuPreview from "./MenuPreview.jsx";
import ConfigChips from "./ConfigChips.jsx";
import { hasMetricData } from "../lib/engine.js";

export default function VariantCard({ view, metric, isChallenger, meta }) {
  const { stats, value, isLeader, config, label } = view;
  const hasData = hasMetricData(metric.id, stats);
  const formatted = hasData ? metric.format(value) : "—";

  return (
    <div
      className={`surface-card flex flex-col rounded-xl p-4 ${
        isLeader && hasData ? "ring-2 ring-win/25" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`grid h-7 w-7 place-items-center rounded-md text-xs font-semibold ${
              isChallenger
                ? "bg-surface-2 text-accent-2"
                : "bg-surface-2 text-accent"
            }`}
          >
            {isChallenger ? "B" : "A"}
          </span>
          <div className="leading-tight">
            <div className="text-sm font-medium text-ink">{label}</div>
            <div className="text-[11px] text-muted">
              {isChallenger ? "Challenger" : "Champion"}
            </div>
          </div>
        </div>
        {isLeader && hasData && (
          <span className="rounded-md bg-surface-2 px-2 py-1 text-[11px] font-medium text-win">
            Leading
          </span>
        )}
      </div>

      <MenuPreview config={config} />

      <div className="mt-3">
        <ConfigChips config={config} />
      </div>

      {isChallenger && meta?.rationale && (
        <div className="mt-3 rounded-lg border border-edge bg-surface-2 p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-ink">Rationale</span>
            <SourceBadge source={meta.source} model={meta.model} />
          </div>
          <p className="text-[12px] leading-relaxed text-muted">{meta.rationale}</p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Visitors" value={stats.visitors.toLocaleString()} />
        <Stat
          label={metric.short}
          value={formatted}
          highlight={isLeader && hasData}
        />
      </div>
    </div>
  );
}

export function SourceBadge({ source, model }) {
  const map = {
    llm: { text: model ? model : "AI", cls: "bg-surface text-muted border border-edge" },
    fallback: { text: "fallback", cls: "bg-surface text-muted border border-edge" },
    simulated: { text: "simulated", cls: "bg-surface text-muted border border-edge" },
  };
  const s = map[source] ?? map.simulated;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${s.cls}`}>
      {s.text}
    </span>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className="rounded-lg border border-edge bg-surface-2 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          highlight ? "text-win" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
