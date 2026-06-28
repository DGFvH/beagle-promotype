// ---------------------------------------------------------------------------
// Challenger generation orchestrator (client side)
// ---------------------------------------------------------------------------
// Chooses how the next challenger variant is produced:
//   - mode "simulated" (default): the local stub in engine.js.
//   - mode "ai": POST to the serverless proxy (api/propose-challenger.js),
//     which calls a real LLM with the server-side key. Any failure - no key,
//     network error, timeout, bad output - silently falls back to the stub so
//     the demo never breaks in front of a room.

import { proposeChallenger, normalizeConfig, isValidHeroConfig } from "./engine.js";

// Validate model output against the enum-constrained hero design space. Anything
// outside HERO_DESIGN_SPACE is rejected so nothing arbitrary is ever injected
// (Section 8 / FR-D2). isValidHeroConfig is the single source of truth.
function isValidConfig(c) {
  return isValidHeroConfig(c);
}

export async function generateChallenger(winner, goal, history, mode = "simulated") {
  if (mode !== "ai") {
    return proposeChallenger(winner, goal, history);
  }

  try {
    const resp = await fetch("/api/propose-challenger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winner: winner.config ?? winner,
        goal,
        history: history.map((r) => ({
          generation: r.generation,
          winnerConfig: r.winnerConfig,
          winnerValue: r.winnerValue,
        })),
      }),
    });

    if (!resp.ok) {
      return fallback(winner, goal, history, await reason(resp));
    }

    const data = await resp.json();
    if (!isValidConfig(data?.config)) {
      return fallback(winner, goal, history, "invalid model output");
    }

    return {
      config: normalizeConfig(data.config),
      rationale: data.rationale || "Model-proposed challenger.",
      source: "llm",
      model: data.model,
    };
  } catch {
    return fallback(winner, goal, history, "request failed");
  }
}

async function reason(resp) {
  if (resp.status === 501) return "AI mode not configured (no API key)";
  try {
    const d = await resp.json();
    return d?.error || `upstream ${resp.status}`;
  } catch {
    return `upstream ${resp.status}`;
  }
}

async function fallback(winner, goal, history, why) {
  const stub = await proposeChallenger(winner, goal, history);
  return { ...stub, source: "fallback", fallbackReason: why };
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
    // 501 => endpoint exists but no key. 200/502 => key present (maybe upstream
    // hiccup). 404 => not deployed with functions (e.g. plain vite dev).
    if (resp.status === 404) return false;
    return resp.status !== 501;
  } catch {
    return false;
  }
}
