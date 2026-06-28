// FR-D1 — Explicit approval gate (pure, testable).
//
// The MVP is human-approved only: NO variant goes live without an explicit
// Approve action (Section 8 forbids auto-approval). This module is the single
// controlled entry point to "go live" (injection + experiment creation). It is
// intentionally pure and side-effect free except through INJECTED callbacks, so
// the FR-D1 `auto` criterion ("until approval, nothing is injected and no live
// experiment is created") is provable by unit test.
//
// States:  pending --approve()--> approved --goLive()--> live
//          pending --reject()---> rejected   (goLive blocked forever)
//
// The go-live seam (`onGoLive`) is the integration point beagle-integrations
// will fill for FR-D2 (cookie-based injection) and FR-D3 (experiment creation +
// readout). Until then it is a caller-supplied callback so we can assert in
// tests it is NEVER invoked before approval and ONLY invoked after.

export const APPROVAL_STATES = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  LIVE: "live",
});

const TERMINAL_FOR_GOLIVE = new Set([
  APPROVAL_STATES.PENDING,
  APPROVAL_STATES.REJECTED,
  APPROVAL_STATES.LIVE,
]);

/**
 * Create a fresh approval gate for a proposed challenger.
 *
 * @param {object} [opts]
 * @param {object} [opts.proposal]  The proposed challenger (hero config + meta).
 *   Carried through purely so the go-live seam and UI can reference it.
 * @returns {ApprovalGate}
 */
export function createApprovalGate(opts = {}) {
  return {
    state: APPROVAL_STATES.PENDING,
    proposal: opts.proposal ?? null,
    decidedAt: null, // timestamp of approve/reject
    wentLiveAt: null, // timestamp the go-live seam ran
    experiment: null, // record returned by the go-live seam (FR-D3)
    rejectionReason: null,
  };
}

export function isApproved(gate) {
  return gate?.state === APPROVAL_STATES.APPROVED;
}

export function isLive(gate) {
  return gate?.state === APPROVAL_STATES.LIVE;
}

/**
 * The ONLY path to approval. Moves pending -> approved. No-op (returns the gate
 * unchanged) from any other state, so a gate can never be re-approved out of a
 * rejected/live state.
 */
export function approve(gate, at = Date.now()) {
  if (!gate || gate.state !== APPROVAL_STATES.PENDING) return gate;
  return { ...gate, state: APPROVAL_STATES.APPROVED, decidedAt: at };
}

/**
 * Reject the proposal. Moves pending -> rejected (permanent for this gate).
 * After rejection, goLive() is unreachable.
 */
export function reject(gate, reason = null, at = Date.now()) {
  if (!gate || gate.state !== APPROVAL_STATES.PENDING) return gate;
  return {
    ...gate,
    state: APPROVAL_STATES.REJECTED,
    decidedAt: at,
    rejectionReason: reason,
  };
}

/**
 * Trigger going live: this is the controlled entry point that runs injection +
 * experiment creation. It is BLOCKED unless the gate is `approved`.
 *
 * The actual injection/experiment work is delegated to `onGoLive` — the seam
 * beagle-integrations implements for FR-D2/D3. Its signature:
 *
 *   onGoLive({ proposal }) -> experimentRecord | Promise<experimentRecord>
 *
 * @returns {{ ok: boolean, reason?: string, gate: ApprovalGate, experiment?: any }}
 *   `ok:false` (and NO call to onGoLive) when the gate is not approved.
 */
export async function goLive(gate, onGoLive, at = Date.now()) {
  if (!gate || gate.state !== APPROVAL_STATES.APPROVED) {
    // Hard block: nothing is injected and no experiment is created.
    return {
      ok: false,
      reason: `goLive blocked: gate is "${gate?.state ?? "none"}", expected "approved"`,
      gate,
    };
  }
  if (typeof onGoLive !== "function") {
    return { ok: false, reason: "goLive blocked: no go-live seam provided", gate };
  }

  const experiment = (await onGoLive({ proposal: gate.proposal })) ?? null;
  const nextGate = {
    ...gate,
    state: APPROVAL_STATES.LIVE,
    wentLiveAt: at,
    experiment,
  };
  return { ok: true, gate: nextGate, experiment };
}

/**
 * Guard helper for UI/callers: can this gate go live right now?
 * (Exported so components don't re-implement the rule.)
 */
export function canGoLive(gate) {
  return isApproved(gate) && !TERMINAL_FOR_GOLIVE.has(gate.state);
}

/**
 * @typedef {Object} ApprovalGate
 * @property {string} state  one of APPROVAL_STATES
 * @property {object|null} proposal
 * @property {number|null} decidedAt
 * @property {number|null} wentLiveAt
 * @property {any} experiment
 * @property {string|null} rejectionReason
 */
