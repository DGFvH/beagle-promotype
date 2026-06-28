// ===========================================================================
// Agentic-loop advance policy (FR-D4) — pure, testable
// ===========================================================================
// FR-D4: the user can switch the agentic loop on so that, after a decision, the
// system proposes the NEXT test. Section 8 forbids auto-approval, so even with
// the loop on, the proposed next challenger MUST route through the FR-D1 approval
// gate (awaiting_approval) — it never goes live by itself.
//
// This module isolates the pure decision so it is unit-testable:
//   - loop ON  -> advance, and the next round is "awaiting_approval" (gated).
//   - loop OFF -> do NOT advance; the decided round stands, no new proposal.
//
// It deliberately knows nothing about React, the network, or how the challenger
// is generated. useExperiment.decide() consumes planNextAfterDecision to choose
// its branch.

export const LOOP_OUTCOME = Object.freeze({
  // Loop is on: propose the next challenger and park it in the approval gate.
  PROPOSE_GATED: "propose_gated",
  // Loop is off: record the decision only; the experiment does not advance.
  HOLD: "hold",
});

/**
 * Decide what happens after a round is decided.
 *
 * @param {object} args
 * @param {boolean} args.loopEnabled  is the agentic loop on?
 * @returns {{ advance: boolean, outcome: string, nextStatus: string|null }}
 *   advance     — should a next challenger be generated?
 *   outcome     — LOOP_OUTCOME.*
 *   nextStatus  — the experiment status to transition to when advancing.
 *                 ALWAYS "awaiting_approval" when advancing — NEVER "running"
 *                 (a live experiment must pass the FR-D1 gate first; Section 8).
 */
export function planNextAfterDecision({ loopEnabled } = {}) {
  if (loopEnabled) {
    return {
      advance: true,
      outcome: LOOP_OUTCOME.PROPOSE_GATED,
      nextStatus: "awaiting_approval", // gated, never auto-live
    };
  }
  return {
    advance: false,
    outcome: LOOP_OUTCOME.HOLD,
    nextStatus: null,
  };
}
