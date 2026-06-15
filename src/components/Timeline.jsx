import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { GitBranch, Trophy } from "lucide-react";
import ConfigChips from "./ConfigChips.jsx";
import { SourceBadge } from "./VariantCard.jsx";

export default function Timeline({ history, metric }) {
  if (!history.length) {
    return (
      <div className="rounded-lg border border-dashed border-edge bg-surface p-10 text-center shadow-sm">
        <p className="text-sm text-muted">
          No generations yet. Run a round and select{" "}
          <span className="font-medium text-ink">Decide & evolve</span> to begin
          the lineage.
        </p>
      </div>
    );
  }

  const chartData = history.map((r) => ({
    gen: `G${r.generation}`,
    value: metric.toChart(r.winnerValue),
  }));

  const first = chartData[0]?.value ?? 0;
  const last = chartData[chartData.length - 1]?.value ?? 0;
  const improving =
    metric.direction === "maximize" ? last >= first : last <= first;
  const deltaPct =
    first !== 0 ? Math.abs(((last - first) / first) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-accent/10 text-accent">
              <GitBranch size={19} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-ink">Lineage proof</h3>
              <p className="text-sm text-muted">
                Winning metric at each decision point, with the baseline held
                as a reference.
              </p>
            </div>
          </div>
          <span
            className={`rounded-md border px-3 py-1.5 text-sm font-semibold tabular-nums ${
              improving
                ? "border-win/25 bg-win/10 text-win"
                : "border-lose/25 bg-lose/10 text-lose"
            }`}
          >
            {improving ? "+" : "-"}
            {deltaPct}% since G1
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f4" vertical={false} />
              <XAxis dataKey="gen" stroke="#66737f" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#66737f"
                fontSize={12}
                tickLine={false}
                width={48}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `${v}${metric.unit === "%" ? "%" : metric.unit}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #d8e0e5",
                  borderRadius: 8,
                  color: "#15202b",
                  fontSize: 12,
                  boxShadow: "0 8px 24px rgba(21,32,43,0.08)",
                }}
                formatter={(v) => [
                  `${v}${metric.unit === "%" ? "%" : metric.unit}`,
                  metric.short,
                ]}
              />
              <ReferenceLine
                y={first}
                stroke="#aeb8c2"
                strokeDasharray="4 4"
                label={{
                  value: "G1 baseline",
                  fill: "#66737f",
                  fontSize: 10,
                  position: "insideTopLeft",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#176b6b"
                strokeWidth={3}
                dot={{ r: 4, fill: "#176b6b", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-ink">Generation records</h3>
          <span className="rounded-md border border-edge bg-surface-2 px-2.5 py-1 text-xs text-muted">
            {history.length} recorded rounds
          </span>
        </div>
        <ol className="space-y-3">
          {history.map((r) => (
            <LineageRow key={r.generation} round={r} metric={metric} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function LineageRow({ round, metric }) {
  const winner = round.entries.find((e) => e.isWinner);
  const loser = round.entries.find((e) => !e.isWinner);
  return (
    <li className="rounded-lg border border-edge bg-surface-2 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface text-sm font-semibold text-accent">
            G{round.generation}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">
                Winner: {winner.label}
              </span>
              <span className="rounded-md border border-win/25 bg-win/10 px-2 py-0.5 text-[11px] font-semibold text-win">
                {metric.format(round.winnerValue)}
              </span>
              <span className="text-[11px] text-muted">
                {Math.round(round.confidence * 100)}% confidence / {round.window} visitors
              </span>
            </div>
            {round.challengerConfig && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                <span>Next challenger: {round.mutation}</span>
                <SourceBadge source={round.source} />
              </div>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-edge bg-surface px-2 py-1 text-[11px] font-medium text-muted">
          <Trophy size={12} />
          kept in lineage
        </span>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <VariantSummary title={`Won (${winner.label})`} tone="win" config={winner.config} />
        {loser && (
          <VariantSummary
            title={`Lost (${loser.label}) / ${metric.format(loser.value)}`}
            tone="muted"
            config={loser.config}
          />
        )}
      </div>

      {round.rationale && (
        <p className="mt-3 rounded-md border border-edge bg-surface px-3 py-2 text-[12px] leading-relaxed text-muted">
          {round.rationale}
        </p>
      )}
    </li>
  );
}

function VariantSummary({ title, tone, config }) {
  return (
    <div className="rounded-md border border-edge bg-surface p-2">
      <div
        className={`mb-1.5 text-[10px] font-semibold ${
          tone === "win" ? "text-win" : "text-muted"
        }`}
      >
        {title}
      </div>
      <ConfigChips config={config} />
    </div>
  );
}
