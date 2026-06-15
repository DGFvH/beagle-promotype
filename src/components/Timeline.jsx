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
import ConfigChips from "./ConfigChips.jsx";
import { SourceBadge } from "./VariantCard.jsx";

export default function Timeline({ history, metric }) {
  if (!history.length) {
    return (
      <div className="surface-card rounded-xl border-dashed p-10 text-center">
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
      <div className="surface-card rounded-xl p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              {metric.label} by generation
            </h3>
            <p className="text-xs text-muted">
              Winning variant metric at each decision point.
            </p>
          </div>
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              improving
                ? "bg-surface-2 text-win"
                : "bg-surface-2 text-lose"
            }`}
          >
            {improving ? "+" : "−"}
            {deltaPct}% since G1
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" vertical={false} />
              <XAxis dataKey="gen" stroke="#8a847c" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#8a847c"
                fontSize={12}
                tickLine={false}
                width={48}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `${v}${metric.unit === "%" ? "%" : metric.unit}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#f0ece6",
                  border: "1px solid #d4cfc6",
                  borderRadius: 8,
                  color: "#1c1b19",
                  fontSize: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
                formatter={(v) => [
                  `${v}${metric.unit === "%" ? "%" : metric.unit}`,
                  metric.short,
                ]}
              />
              <ReferenceLine
                y={first}
                stroke="#c5bfb6"
                strokeDasharray="4 4"
                label={{
                  value: "G1 baseline",
                  fill: "#8a847c",
                  fontSize: 10,
                  position: "insideTopLeft",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3a5248"
                strokeWidth={2}
                dot={{ r: 3, fill: "#3a5248", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="surface-card rounded-xl p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">Lineage</h3>
        <ol className="relative space-y-3 border-l border-edge pl-5">
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
    <li className="relative">
      <span className="absolute -left-[27px] top-1.5 grid h-5 w-5 place-items-center rounded-full border border-edge bg-surface text-[10px] font-medium text-accent">
        {round.generation}
      </span>
      <div className="rounded-lg border border-edge bg-surface-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">
            Generation {round.generation}
          </span>
          <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium text-win">
            {metric.format(round.winnerValue)}
          </span>
          <span className="text-[11px] text-muted">
            {Math.round(round.confidence * 100)}% conf · {round.window} visitors
          </span>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-edge bg-surface p-2">
            <div className="mb-1 text-[10px] font-medium text-muted">
              Won ({winner.label})
            </div>
            <ConfigChips config={winner.config} />
          </div>
          {loser && (
            <div className="rounded-md border border-edge bg-surface p-2 opacity-80">
              <div className="mb-1 text-[10px] font-medium text-muted">
                Lost ({loser.label}) · {metric.format(loser.value)}
              </div>
              <ConfigChips config={loser.config} />
            </div>
          )}
        </div>

        {round.challengerConfig && (
          <div className="mt-2 rounded-md border border-edge bg-surface p-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-ink">
                Next challenger: {round.mutation}
              </span>
              <SourceBadge source={round.source} />
            </div>
            {round.rationale && (
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {round.rationale}
              </p>
            )}
            <div className="mt-1.5">
              <ConfigChips config={round.challengerConfig} />
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
