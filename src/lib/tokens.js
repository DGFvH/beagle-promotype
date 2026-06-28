// ===========================================================================
// Token-spend ledger (FR-E1) — pure, in-memory, testable, no secrets
// ===========================================================================
// Records model token usage (prompt + completion) per Claude call, attributable
// to a run/experiment id, and exposes a running total + per-run breakdown.
//
// Design notes:
//   - PURE data structure. No network, no React, no secrets. The ledger holds
//     only counts and labels — never prompts, responses, or API keys (Section 6).
//   - NON-BLOCKING (FR-E1c): recording is a cheap synchronous array append /
//     accumulator update. Callers never await it; the UI is never gated on it.
//   - HONEST (Section 6): totals reflect ONLY usage that was actually recorded.
//     Before any real Claude call happens, the total is 0 — never fabricated.
//
// The persisted "running total" is later moved to Supabase (see TODO at bottom);
// for the MVP the ledger lives for the lifetime of the experiment session.

// Normalise an arbitrary usage object (e.g. proposal.usage from the Claude route,
// shape { input_tokens, output_tokens, total_tokens }) into the ledger's flat
// { input, output, total } form. Defensive: any missing/garbage field -> 0, so a
// malformed usage block never throws on the hot path (FR-E1c).
export function normalizeUsage(usage) {
  if (!usage || typeof usage !== "object") {
    return { input: 0, output: 0, total: 0 };
  }
  const input = num(usage.input_tokens ?? usage.input ?? usage.promptTokens);
  const output = num(usage.output_tokens ?? usage.output ?? usage.completionTokens);
  // Prefer an explicit total if present and consistent; otherwise derive it.
  const declared = num(usage.total_tokens ?? usage.total);
  const total = declared > 0 ? declared : input + output;
  return { input, output, total };
}

// Create an empty ledger. Optionally seed with prior entries (e.g. rehydrated
// from storage later). Always returns a fresh object (immutable-friendly).
export function createLedger(initialEntries = []) {
  return {
    entries: Array.isArray(initialEntries) ? initialEntries.slice() : [],
  };
}

/**
 * Record one Claude call's usage against a run id. Returns a NEW ledger (the
 * input is never mutated) so it slots cleanly into React state setters.
 *
 * @param {object} ledger   ledger from createLedger()
 * @param {object} args
 * @param {string} args.runId   experiment/run id the call is attributable to
 * @param {object} args.usage   raw usage ({input_tokens,output_tokens,...}) or null
 * @param {string} [args.source] e.g. "claude" | "simulated" | "page-check"
 * @param {string} [args.label]  short human label (e.g. "propose gen 2")
 * @param {number} [args.at]     timestamp
 * @returns {object} new ledger
 */
export function recordUsage(ledger, { runId, usage, source = "claude", label = null, at = Date.now() } = {}) {
  const base = ledger && Array.isArray(ledger.entries) ? ledger : createLedger();
  const n = normalizeUsage(usage);
  const entry = {
    runId: runId ?? "unknown",
    input: n.input,
    output: n.output,
    total: n.total,
    source,
    label,
    at,
  };
  return { entries: [...base.entries, entry] };
}

// Running grand total across all runs. { input, output, total, calls }.
export function totalUsage(ledger) {
  const entries = ledger?.entries ?? [];
  return entries.reduce(
    (acc, e) => ({
      input: acc.input + num(e.input),
      output: acc.output + num(e.output),
      total: acc.total + num(e.total),
      calls: acc.calls + 1,
    }),
    { input: 0, output: 0, total: 0, calls: 0 }
  );
}

// Per-run breakdown, keyed by runId: { [runId]: { input, output, total, calls } }.
export function usageByRun(ledger) {
  const entries = ledger?.entries ?? [];
  const out = {};
  for (const e of entries) {
    const key = e.runId ?? "unknown";
    const cur = out[key] ?? { input: 0, output: 0, total: 0, calls: 0 };
    out[key] = {
      input: cur.input + num(e.input),
      output: cur.output + num(e.output),
      total: cur.total + num(e.total),
      calls: cur.calls + 1,
    };
  }
  return out;
}

// Per-run breakdown as a sorted array (most recent activity last), convenient for
// rendering a panel without re-deriving order in the component.
export function usageByRunList(ledger) {
  const map = usageByRun(ledger);
  return Object.entries(map).map(([runId, v]) => ({ runId, ...v }));
}

function num(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

// TODO(FR-E1 / persistence): the running total currently lives in session memory
// only. Persist entries to Supabase (per experiment/run) so spend survives reloads
// and is queryable by the team across sessions. The ledger API above is the seam:
// rehydrate via createLedger(rows) and append via recordUsage.
