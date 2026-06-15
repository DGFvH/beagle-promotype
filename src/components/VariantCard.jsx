import { Crown, FlaskConical, Trophy, Wand2 } from "lucide-react";
import MenuPreview from "./MenuPreview.jsx";
import ConfigChips from "./ConfigChips.jsx";
import { hasMetricData } from "../lib/engine.js";

export default function VariantCard({ view, metric, isChallenger, meta }) {
  const { stats, value, isLeader, config, label } = view;
  const hasData = hasMetricData(metric.id, stats);
  const formatted = hasData ? metric.format(value) : "-";
  const RoleIcon = isChallenger ? FlaskConical : Crown;

  return (
    <div
      className={`flex min-w-0 flex-col rounded-lg border bg-surface p-3 shadow-sm ${
        isLeader && hasData ? "border-win/45 ring-2 ring-win/15" : "border-edge"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
              isChallenger ? "bg-accent-2/10 text-accent-2" : "bg-accent/10 text-accent"
            }`}
          >
            <RoleIcon size={17} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">{label}</div>
            <div className="truncate text-[11px] text-muted">
              {isChallenger ? "Generated challenger" : "Current champion"}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div
            className={`text-xl font-semibold tabular-nums ${
              isLeader && hasData ? "text-win" : "text-ink"
            }`}
          >
            {formatted}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">{metric.short}</div>
        </div>
      </div>

      {isLeader && hasData && (
        <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-win/25 bg-win/10 px-2 py-0.5 text-[11px] font-semibold text-win">
          <Trophy size={13} />
          Leading
        </div>
      )}

      <MenuPreview config={config} variant="compact" />

      <div className="mt-2">
        <ConfigChips config={config} />
      </div>

      {isChallenger && meta?.rationale && (
        <div className="mt-2 rounded-lg border border-edge bg-surface-2 p-2">
          <div className="mb-1 flex items-center gap-1.5">
            <Wand2 size={13} className="text-accent-2" />
            <span className="text-[11px] font-semibold text-ink">Rationale</span>
            <SourceBadge source={meta.source} model={meta.model} />
          </div>
          <p className="line-clamp-2 text-[11px] leading-snug text-muted">{meta.rationale}</p>
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2">
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
    llm: { text: model ? model : "AI", cls: "bg-accent/10 text-accent border border-accent/20" },
    fallback: { text: "fallback", cls: "bg-surface text-muted border border-edge" },
    simulated: { text: "simulated", cls: "bg-surface text-muted border border-edge" },
  };
  const s = map[source] ?? map.simulated;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${s.cls}`}>
      {s.text}
    </span>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className="rounded-lg border border-edge bg-surface-2 px-2.5 py-1.5">
      <div className="text-[10px] font-medium uppercase text-muted">
        {label}
      </div>
      <div
        className={`mt-0.5 text-base font-semibold tabular-nums ${
          highlight ? "text-win" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
