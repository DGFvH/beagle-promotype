// ---------------------------------------------------------------------------
// Challenger generation orchestrator (client side) — hero design space
// ---------------------------------------------------------------------------
// Chooses how the next hero challenger variant + hypothesis are produced:
//   - mode "simulated" (default): the local stub in engine.js, with a clearly
//     SIMULATED hypothesis synthesised from the mutation (never presented as a
//     real Claude result — Section 6).
//   - mode "ai": POST to the serverless proxy (api/propose-challenger.js), which
//     calls Claude with the server-side key (the key never reaches the browser),
//     the chosen metric, the current hero, and the supplied design system /
//     guardrails (FR-C1/FR-C2). Any failure — no key (501), network error,
//     timeout, guardrail block, or malformed output — silently falls back to the
//     stub so the optimisation loop never breaks.
//
// The returned shape always carries: { config, hypothesis, rationale, source,
// model?, diff?, usage?, blocked?, blockReason? } so the approval UI can render
// the hypothesis + the diff vs the current hero before any approval.

import {
  proposeChallenger,
  normalizeConfig,
  isValidHeroConfig,
  describeMutation,
  stubRationale,
} from "./engine.js";

// Validate model output against the enum-constrained hero design space. Anything
// outside HERO_DESIGN_SPACE is rejected so nothing arbitrary is ever injected
// (Section 8 / FR-D2 / FR-C1d). isValidHeroConfig is the single source of truth.
function isValidConfig(c) {
  return isValidHeroConfig(c);
}

/**
 * Generate the next challenger.
 *
 * @param {object} winner   Champion variant ({ config } or a bare config).
 * @param {string} goal     Metric id being optimised (ctr|conversion|timeToAction).
 * @param {Array}  history  Prior rounds (for lineage context).
 * @param {string} mode     "simulated" (default) | "ai".
 * @param {object} [opts]   { guardrails } — the supplied design system / guardrails
 *                          (FR-F2/FR-C2) forwarded to the proposal prompt.
 */
export async function generateChallenger(winner, goal, history, mode = "simulated", opts = {}) {
  const currentConfig = winner?.config ?? winner;
  const guardrails = opts.guardrails ?? null;

  if (mode !== "ai") {
    return stubProposal(winner, goal, history, { source: "simulated" });
  }

  try {
    const resp = await fetch("/api/propose-challenger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current: currentConfig,
        goal,
        history: history.map((r) => ({
          generation: r.generation,
          winnerConfig: r.winnerConfig,
          winnerValue: r.winnerValue,
        })),
        // Pass the supplied design system / guardrails to the prompt (FR-C2a).
        // Only the doc/parsed text is sent — no secrets — and the server is the
        // enforcement of record (it re-runs checkProposal regardless).
        guardrails,
      }),
    });

    if (!resp.ok) {
      // 422 invalid_output, 502 upstream/timeout, 501 not_configured, etc.
      return fallback(winner, goal, history, await reason(resp));
    }

    const data = await resp.json();

    // Guardrail block: surface it (do not fall back to a stub that might pass —
    // the user must see WHY Claude's proposal was blocked). Still falls back to a
    // usable simulated challenger so the loop can continue, but flags the block.
    if (data?.blocked) {
      const stub = await stubProposal(winner, goal, history, { source: "fallback" });
      return {
        ...stub,
        blocked: true,
        blockReason: data.reason || "Proposal blocked by a guardrail.",
        violations: data.violations ?? [],
        usage: data.usage,
        fallbackReason: "claude proposal blocked by guardrail",
      };
    }

    // Validate the returned variant against the hero design space (FR-C1d): never
    // trust the wire — reject anything out-of-space and fall back.
    if (!isValidConfig(data?.variant)) {
      return fallback(winner, goal, history, "invalid model output");
    }
    const hypothesis =
      typeof data.hypothesis === "string" && data.hypothesis.trim()
        ? data.hypothesis.trim()
        : null;
    if (!hypothesis) {
      return fallback(winner, goal, history, "missing hypothesis");
    }

    return {
      config: normalizeConfig(data.variant),
      hypothesis,
      // Keep `rationale` populated for existing consumers (lineage/decision UI).
      rationale: hypothesis,
      diff: Array.isArray(data.diff) ? data.diff : undefined,
      usage: data.usage,
      source: "claude",
      model: data.model,
    };
  } catch {
    return fallback(winner, goal, history, "request failed");
  }
}

// Build a proposal from the local stub, synthesising a clearly-labelled
// hypothesis from the mutation. Used as the default simulated path AND the
// graceful fallback. `source` distinguishes the two ("simulated" vs "fallback").
async function stubProposal(winner, goal, history, { source }) {
  const stub = await proposeChallenger(winner, goal, history);
  const parent = winner?.config ?? winner;
  return {
    config: stub.config,
    hypothesis: simulatedHypothesis(parent, stub.config, goal),
    rationale: stub.rationale,
    simulated: true, // never present this as a real Claude result (Section 6)
    source,
  };
}

// A clearly-simulated one-paragraph hypothesis (FR-C1b): states the change and
// the expected effect, prefixed so the UI/reviewer knows it is NOT from Claude.
function simulatedHypothesis(parent, child, goal) {
  const change = describeMutation(parent, child);
  const sentence = stubRationale(parent, child, goal);
  return `Simulated proposal (no live model): change ${change}. ${sentence}`;
}

async function reason(resp) {
  if (resp.status === 501) return "AI mode not configured (no API key)";
  try {
    const d = await resp.json();
    return d?.reason || d?.error || `upstream ${resp.status}`;
  } catch {
    return `upstream ${resp.status}`;
  }
}

async function fallback(winner, goal, history, why) {
  const stub = await stubProposal(winner, goal, history, { source: "fallback" });
  return { ...stub, fallbackReason: why };
}

// Is the AI endpoint actually configured? Used to show the right UI state.
// Returns true/false; never throws.
export async function probeAiAvailable() {
  try {
    const resp = await fetch("/api/propose-challenger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ probe: true }),
    });
    // 501 => endpoint exists but no key. 200 => key present. 404 => not deployed
    // with functions (e.g. plain build with no dev middleware / serverless).
    if (resp.status === 404) return false;
    return resp.status !== 501;
  } catch {
    return false;
  }
}
