import { describe, it, expect, vi } from "vitest";
import {
  APPROVAL_STATES,
  createApprovalGate,
  approve,
  reject,
  goLive,
  isApproved,
  isLive,
  canGoLive,
} from "../approval.js";

// FR-D1 (auto): "Until approval, nothing is injected and no live experiment is
// created." We model injection + experiment creation as an injected `onGoLive`
// seam (the FR-D2/D3 integration point) and assert it is NEVER invoked before an
// explicit approve(), and ONLY invoked after.

const proposal = { config: { headline: "Turn visitors into customers" }, label: "Challenger" };

describe("FR-D1 approval gate — go-live is unreachable before approval", () => {
  it("starts pending with no experiment and cannot go live", () => {
    const gate = createApprovalGate({ proposal });
    expect(gate.state).toBe(APPROVAL_STATES.PENDING);
    expect(gate.experiment).toBe(null);
    expect(isApproved(gate)).toBe(false);
    expect(canGoLive(gate)).toBe(false);
  });

  it("does NOT fire the injection/experiment seam while pending", async () => {
    const onGoLive = vi.fn(() => ({ id: "exp_live" }));
    const gate = createApprovalGate({ proposal });

    const res = await goLive(gate, onGoLive);

    expect(res.ok).toBe(false);
    expect(onGoLive).not.toHaveBeenCalled(); // nothing injected, no experiment
    expect(res.gate.state).toBe(APPROVAL_STATES.PENDING);
    expect(res.gate.experiment).toBe(null); // no experiment record created
  });

  it("after approve(), the go-live seam runs exactly once and records an experiment", async () => {
    const onGoLive = vi.fn(() => ({ id: "exp_live", metric: "ctr" }));
    let gate = createApprovalGate({ proposal });

    gate = approve(gate);
    expect(gate.state).toBe(APPROVAL_STATES.APPROVED);
    expect(canGoLive(gate)).toBe(true);

    const res = await goLive(gate, onGoLive);

    expect(res.ok).toBe(true);
    expect(onGoLive).toHaveBeenCalledTimes(1);
    expect(onGoLive).toHaveBeenCalledWith({ proposal });
    expect(res.gate.state).toBe(APPROVAL_STATES.LIVE);
    expect(res.experiment).toEqual({ id: "exp_live", metric: "ctr" });
    expect(isLive(res.gate)).toBe(true);
  });

  it("approve is the ONLY path to go live — reject() permanently blocks it", async () => {
    const onGoLive = vi.fn(() => ({ id: "exp_live" }));
    let gate = createApprovalGate({ proposal });

    gate = reject(gate, "Off-brand headline");
    expect(gate.state).toBe(APPROVAL_STATES.REJECTED);
    expect(gate.rejectionReason).toBe("Off-brand headline");

    const res = await goLive(gate, onGoLive);
    expect(res.ok).toBe(false);
    expect(onGoLive).not.toHaveBeenCalled();

    // A rejected gate can never be approved back into a live state.
    const reApproved = approve(gate);
    expect(reApproved.state).toBe(APPROVAL_STATES.REJECTED);
  });

  it("a gate can only go live once (no double injection)", async () => {
    const onGoLive = vi.fn(() => ({ id: "exp_live" }));
    let gate = approve(createApprovalGate({ proposal }));

    const first = await goLive(gate, onGoLive);
    expect(first.ok).toBe(true);

    // Re-attempting from the now-live gate must not re-inject.
    const second = await goLive(first.gate, onGoLive);
    expect(second.ok).toBe(false);
    expect(onGoLive).toHaveBeenCalledTimes(1);
  });

  it("blocks go-live if no seam is supplied even when approved", async () => {
    const gate = approve(createApprovalGate({ proposal }));
    const res = await goLive(gate, undefined);
    expect(res.ok).toBe(false);
    expect(res.gate.state).toBe(APPROVAL_STATES.APPROVED);
  });
});
