import { describe, it, expect } from "vitest";
import { planNextAfterDecision, LOOP_OUTCOME } from "../loop.js";

// FR-D4b (manual in spec, proven here at the policy level): with the loop ON, a
// decided test produces a NEXT proposed test — but it MUST route through the
// FR-D1 approval gate (awaiting_approval), never straight to a live experiment
// (Section 8 forbids auto-approval). With the loop OFF, a decided test does not
// advance.

describe("FR-D4 agentic-loop advance policy", () => {
  it("loop ON: advances and routes the next test to awaiting_approval (gated, never live)", () => {
    const plan = planNextAfterDecision({ loopEnabled: true });
    expect(plan.advance).toBe(true);
    expect(plan.outcome).toBe(LOOP_OUTCOME.PROPOSE_GATED);
    // The next status is the approval gate — NOT "running"/"live".
    expect(plan.nextStatus).toBe("awaiting_approval");
    expect(plan.nextStatus).not.toBe("running");
    expect(plan.nextStatus).not.toBe("live");
  });

  it("loop OFF: does not advance and proposes no next test", () => {
    const plan = planNextAfterDecision({ loopEnabled: false });
    expect(plan.advance).toBe(false);
    expect(plan.outcome).toBe(LOOP_OUTCOME.HOLD);
    expect(plan.nextStatus).toBe(null);
  });

  it("never produces an auto-live outcome regardless of input (Section 8)", () => {
    for (const loopEnabled of [true, false, undefined]) {
      const plan = planNextAfterDecision({ loopEnabled });
      expect(plan.nextStatus).not.toBe("running");
      expect(plan.nextStatus).not.toBe("live");
    }
  });
});
