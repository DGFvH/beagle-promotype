import { Coins } from "lucide-react";

// FR-E1 — internal token-spend panel. Shows the running total of model token
// usage (prompt + completion) recorded across the session, plus a per-run
// breakdown. Clearly labelled INTERNAL. No secrets, no prompts/responses — only
// counts. Totals reflect ONLY usage actually recorded: 0 until a real Claude call
// happens, shown honestly (Section 6 — no fabricated numbers).
export default function TokenPanel({ totals, byRun }) {
  const t = totals ?? { input: 0, output: 0, total: 0, calls: 0 };
  const runs = byRun ?? [];
  const hasSpend = t.total > 0;

  return (
    <section
      className="rounded-lg border border-edge bg-surface p-3 shadow-sm"
      aria-label="Token spend (internal)"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
          <Coins size={13} />
          Token spend
        </div>
        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
          Internal
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums text-ink">
          {t.total.toLocaleString()}
        </span>
        <span className="text-[11px] text-muted">total tokens</span>
      </div>

      {hasSpend ? (
        <>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <Stat label="Prompt" value={t.input} />
            <Stat label="Completion" value={t.output} />
            <Stat label="Calls" value={t.calls} />
          </div>

          {runs.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Per run
              </div>
              <ul className="space-y-1">
                {runs.map((r) => (
                  <li
                    key={r.runId}
                    className="flex items-center justify-between gap-2 rounded-md border border-edge bg-surface-2 px-2 py-1 text-[11px]"
                  >
                    <span className="truncate font-medium text-ink" title={r.runId}>
                      {r.runId}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {r.total.toLocaleString()} tok / {r.calls} call
                      {r.calls === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        // Honest empty state: no fabricated numbers before a real model call.
        <p className="mt-2 text-[11px] leading-snug text-muted">
          No model tokens recorded yet. Spend appears here once a live Claude
          proposal runs (AI evolution mode). Simulated proposals cost 0 tokens.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-edge bg-surface-2 px-2 py-1.5">
      <div className="text-[10px] font-medium text-muted">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold tabular-nums text-ink">
        {Number(value ?? 0).toLocaleString()}
      </div>
    </div>
  );
}
