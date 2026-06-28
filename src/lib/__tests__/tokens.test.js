import { describe, it, expect } from "vitest";
import {
  createLedger,
  recordUsage,
  totalUsage,
  usageByRun,
  usageByRunList,
  normalizeUsage,
} from "../tokens.js";

// FR-E1a (auto): every Claude call records token usage (prompt + completion)
// attributable to an experiment/run.
// FR-E1b (auto): a running total of token spend is queryable.
// The proposal route returns usage as { input_tokens, output_tokens, total_tokens }
// (api/_lib/proposal.js extractUsage) — the ledger consumes exactly that shape.

const claudeUsage = (i, o) => ({
  input_tokens: i,
  output_tokens: o,
  total_tokens: i + o,
});

describe("FR-E1 token ledger — honest, attributable, totalled", () => {
  it("starts empty with a zero running total (no fabricated numbers)", () => {
    const ledger = createLedger();
    expect(ledger.entries).toEqual([]);
    expect(totalUsage(ledger)).toEqual({ input: 0, output: 0, total: 0, calls: 0 });
    expect(usageByRunList(ledger)).toEqual([]);
  });

  it("records prompt + completion usage attributable to a run (FR-E1a)", () => {
    let ledger = createLedger();
    ledger = recordUsage(ledger, {
      runId: "exp_1",
      usage: claudeUsage(100, 40),
      source: "claude",
      label: "propose gen 1",
    });

    expect(ledger.entries).toHaveLength(1);
    const e = ledger.entries[0];
    expect(e.runId).toBe("exp_1");
    expect(e.input).toBe(100);
    expect(e.output).toBe(40);
    expect(e.total).toBe(140);
    expect(e.source).toBe("claude");
    expect(e.label).toBe("propose gen 1");
  });

  it("computes a correct running grand total across calls (FR-E1b)", () => {
    let ledger = createLedger();
    ledger = recordUsage(ledger, { runId: "exp_1", usage: claudeUsage(100, 40) });
    ledger = recordUsage(ledger, { runId: "exp_1", usage: claudeUsage(50, 10) });
    ledger = recordUsage(ledger, { runId: "exp_2", usage: claudeUsage(200, 60) });

    expect(totalUsage(ledger)).toEqual({
      input: 350,
      output: 110,
      total: 460,
      calls: 3,
    });
  });

  it("breaks usage down per run (attribution)", () => {
    let ledger = createLedger();
    ledger = recordUsage(ledger, { runId: "exp_1", usage: claudeUsage(100, 40) });
    ledger = recordUsage(ledger, { runId: "exp_1", usage: claudeUsage(50, 10) });
    ledger = recordUsage(ledger, { runId: "exp_2", usage: claudeUsage(200, 60) });

    expect(usageByRun(ledger)).toEqual({
      exp_1: { input: 150, output: 50, total: 200, calls: 2 },
      exp_2: { input: 200, output: 60, total: 260, calls: 1 },
    });
    const list = usageByRunList(ledger);
    expect(list).toHaveLength(2);
    expect(list.find((r) => r.runId === "exp_1").total).toBe(200);
  });

  it("never mutates the input ledger (state-setter safe)", () => {
    const ledger = createLedger();
    const next = recordUsage(ledger, { runId: "exp_1", usage: claudeUsage(1, 1) });
    expect(ledger.entries).toHaveLength(0);
    expect(next.entries).toHaveLength(1);
    expect(next).not.toBe(ledger);
  });

  it("treats simulated/missing usage as 0 — no fabricated spend (Section 6)", () => {
    let ledger = createLedger();
    // Simulated proposals carry no `usage`; a real Claude call adds tokens.
    ledger = recordUsage(ledger, { runId: "exp_1", usage: undefined, source: "simulated" });
    ledger = recordUsage(ledger, { runId: "exp_1", usage: null, source: "fallback" });
    ledger = recordUsage(ledger, { runId: "exp_1", usage: { junk: true }, source: "claude" });

    expect(totalUsage(ledger).total).toBe(0);
    expect(totalUsage(ledger).calls).toBe(3); // calls counted, spend honestly 0
  });

  it("normalizeUsage derives a total when none is declared, and is defensive", () => {
    expect(normalizeUsage(claudeUsage(10, 5))).toEqual({ input: 10, output: 5, total: 15 });
    expect(normalizeUsage({ input_tokens: 10, output_tokens: 5 })).toEqual({
      input: 10,
      output: 5,
      total: 15,
    });
    expect(normalizeUsage(null)).toEqual({ input: 0, output: 0, total: 0 });
    expect(normalizeUsage("garbage")).toEqual({ input: 0, output: 0, total: 0 });
  });
});
