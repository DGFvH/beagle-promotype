// ===========================================================================
// Proposal core — pure, importable, network-free (FR-C1 / FR-C2 / FR-E1)
// ===========================================================================
// This module holds everything about a Claude hero-variant proposal that does
// NOT need the network: building the prompt (with the chosen metric + current
// hero + the design system + guardrails), validating/sanitising the model's
// output, running the guardrail gate, and normalising token usage.
//
// It is deliberately split out of api/propose-challenger.js so the prompt-build,
// validation and fallback logic are unit-testable without an API key or a live
// model call (Section 6: "add an automated test for every `auto` criterion").
//
// Shared infra: both the serverless handler and the Vitest suite import from
// here. The handler adds ONLY the Anthropic SDK call around this core.

import {
  HERO_DESIGN_SPACE,
  HERO_ATTRIBUTES,
  HERO_OPTIONS,
  isValidHeroConfig,
  normalizeConfig,
  defaultHeroConfig,
} from "../../src/lib/engine.js";
import {
  buildGuardrailPromptContext,
  getStyleGuide,
  checkProposal,
} from "../../src/lib/guardrails/index.js";

// Direction-aware, human-readable description of each goal metric. Keeps the
// prompt honest about whether higher or lower is better (mirrors metrics.js).
export const GOAL_TEXT = {
  ctr: {
    name: "click-through rate (CTR)",
    aim: "maximize the share of visitors who click the primary CTA (higher is better)",
  },
  conversion: {
    name: "conversion rate",
    aim: "maximize the share of visitors who complete the target action (higher is better)",
  },
  timeToAction: {
    name: "time-to-action",
    aim: "minimize the average seconds before a visitor clicks the primary CTA (lower is better)",
  },
};

function goalDescriptor(goal) {
  return (
    GOAL_TEXT[goal] ?? { name: String(goal), aim: `optimize ${String(goal)}` }
  );
}

// ---------------------------------------------------------------------------
// Structured-output schema (Claude `output_config.format` / json_schema)
// ---------------------------------------------------------------------------
// Constrains Claude to return exactly { variant, hypothesis }, where `variant`
// is enum-constrained to the hero design space (Section 8: no open-ended UI) and
// `hypothesis` is a single paragraph. Even with structured output we re-validate
// server-side (FR-C1 criterion 4) — schema adherence is necessary, not trusted.
export const PROPOSAL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    variant: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(
        HERO_ATTRIBUTES.map((key) => [
          key,
          { type: "string", enum: HERO_OPTIONS[key].slice() },
        ])
      ),
      required: HERO_ATTRIBUTES.slice(),
    },
    hypothesis: {
      type: "string",
      description:
        "One paragraph stating the concrete change and its expected effect on the chosen metric.",
    },
  },
  required: ["variant", "hypothesis"],
};

// ---------------------------------------------------------------------------
// Prompt builder (FR-C1a, FR-C2a)
// ---------------------------------------------------------------------------
// Returns { system, user }. The user prompt MUST include: the chosen metric
// (direction-aware), the current hero config, the enum design space, and the
// supplied design system + guardrails (buildGuardrailPromptContext). Tests
// assert these are present.
export function buildProposalPrompt({ current, goal, history, guardrails }) {
  const hero = normalizeConfig(current ?? defaultHeroConfig());
  const g = goalDescriptor(goal);

  const designSpaceLines = HERO_ATTRIBUTES.map((key) => {
    const spec = HERO_DESIGN_SPACE[key];
    return `  - ${key} (${spec.label}): one of ${spec.options
      .map((o) => JSON.stringify(o))
      .join(", ")}`;
  }).join("\n");

  const heroLines = HERO_ATTRIBUTES.map(
    (key) => `  - ${key}: ${JSON.stringify(hero[key])}`
  ).join("\n");

  const lineage = Array.isArray(history)
    ? history
        .slice(-8)
        .map((r) => {
          const c = r.winnerConfig ?? r.config ?? {};
          const val =
            r.winnerValue != null ? ` (metric=${round(r.winnerValue)})` : "";
          const summary = HERO_ATTRIBUTES.filter((k) => c[k] != null)
            .map((k) => `${k}=${c[k]}`)
            .join(", ");
          return `  - Gen ${r.generation ?? "?"}: won ${summary}${val}`;
        })
        .join("\n")
    : "";

  // The design system (style guide, immutables, legal limits) — supplied by the
  // guardrails owner (FR-F2). This is what FR-C2 requires reach the prompt.
  const guardrailContext = buildGuardrailPromptContext(guardrails);
  const styleGuide = getStyleGuide(guardrails);

  const system =
    "You are an expert conversion-rate-optimization designer running an automated " +
    "A/B testing loop on a website hero section. You propose the next hero variant " +
    "and an explicit hypothesis. You ONLY ever select attribute values from the " +
    "supplied enum design space — never invent new copy, markup, styles, or " +
    "attributes. You stay strictly within the supplied design system and never " +
    "violate any supplied guardrail. Respond ONLY with the requested structured JSON.";

  const userParts = [
    `Chosen metric: ${g.name}. Objective: ${g.aim}.`,
    "",
    "HERO DESIGN SPACE (you MUST pick each attribute's value from its list — nothing else is allowed):",
    designSpaceLines,
    "",
    "CURRENT HERO (the champion to beat):",
    heroLines,
    "",
    lineage
      ? `HISTORY of winning heroes so far:\n${lineage}`
      : "No prior history yet.",
  ];

  if (guardrailContext) {
    userParts.push(
      "",
      "DESIGN SYSTEM & GUARDRAILS (hard constraints — the proposal must conform):",
      guardrailContext
    );
  } else {
    userParts.push(
      "",
      "DESIGN SYSTEM & GUARDRAILS: none supplied for this project; keep the variant tasteful and consistent with the current hero."
    );
  }

  userParts.push(
    "",
    "Propose ONE new hero variant likely to beat the champion on the chosen metric.",
    "Prefer changing a single attribute so the experiment isolates the effect, and",
    "avoid repeating a configuration that already lost.",
    "",
    "Return a hero `variant` (every attribute set to an allowed option) and a",
    "one-paragraph `hypothesis` that states (a) exactly what you changed versus the",
    `current hero and (b) the expected effect on the ${g.name}.`
  );

  return { system, user: userParts.join("\n"), styleGuide };
}

// ---------------------------------------------------------------------------
// Output validation / sanitisation (FR-C1 criterion 4, FR-C2, FR-F)
// ---------------------------------------------------------------------------
// Takes whatever the model returned (already-parsed object, or a raw string),
// plus the current hero + guardrails, and returns a structured result the
// handler can return directly. NEVER returns unvalidated markup: the config is
// whitelisted to the enum design space and the hypothesis is coerced to a plain
// sanitised string. Guardrail violations are surfaced as `blocked`, never fixed.
//
// Returns one of:
//   { ok: true,  variant, hypothesis, diff }                       -> usable proposal
//   { ok: false, blocked: true, reason, violations, variant, ... } -> guardrail block
//   { ok: false, blocked: false, reason }                          -> malformed -> caller falls back
export function sanitizeProposal(rawOutput, { current, goal, guardrails } = {}) {
  const currentHero = normalizeConfig(current ?? defaultHeroConfig());

  const parsed = coerceObject(rawOutput);
  if (!parsed) {
    return { ok: false, blocked: false, reason: "model output was not parseable JSON" };
  }

  // The variant may be under `variant`, or (lenient) at the top level.
  const candidate = parsed.variant ?? parsed.config ?? parsed;

  // Hard whitelist: every attribute must be a known enum option. We do NOT
  // fall back to the champion's value per-attribute — a malformed/partial
  // variant must fail so the caller falls back to the local stub rather than
  // silently presenting a half-real Claude result (Section 6).
  if (!isValidHeroConfig(candidate)) {
    return {
      ok: false,
      blocked: false,
      reason: "model variant was outside the hero design space",
    };
  }
  const variant = normalizeConfig(candidate); // strips any extra keys

  const hypothesis = sanitizeHypothesis(parsed.hypothesis);
  if (!hypothesis) {
    return {
      ok: false,
      blocked: false,
      reason: "model output did not include a usable hypothesis",
    };
  }

  // Guardrails win (Section 0.3): run the deterministic gate server-side. A
  // violating variant is NEVER returned as approved — it is surfaced blocked.
  const verdict = checkProposal(currentHero, variant, guardrails);
  const diff = describeDiff(currentHero, variant);

  if (!verdict.allowed) {
    return {
      ok: false,
      blocked: true,
      reason: verdict.summary,
      violations: verdict.violations,
      variant,
      hypothesis,
      diff,
    };
  }

  return {
    ok: true,
    variant,
    hypothesis,
    diff,
    warnings: verdict.warnings ?? [],
  };
}

// Per-attribute diff vs the current hero (FR-C1 criterion 3: the UI renders a
// "what changed" diff). Plain data, safe to serialise.
export function describeDiff(from, to) {
  const a = normalizeConfig(from);
  const b = normalizeConfig(to);
  const changes = [];
  for (const key of HERO_ATTRIBUTES) {
    if (a[key] !== b[key]) {
      changes.push({
        attribute: key,
        label: HERO_DESIGN_SPACE[key].label,
        from: a[key],
        to: b[key],
      });
    }
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Token usage (FR-E1)
// ---------------------------------------------------------------------------
// Normalise Anthropic's `response.usage` into a flat, attributable object the
// FR-E1 owner can total. Defensive: any missing field becomes 0/undefined so a
// malformed usage block never throws on the hot path.
export function extractUsage(usage) {
  if (!usage || typeof usage !== "object") {
    return { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
  }
  const input = num(usage.input_tokens);
  const output = num(usage.output_tokens);
  const cacheCreate = numOrUndef(usage.cache_creation_input_tokens);
  const cacheRead = numOrUndef(usage.cache_read_input_tokens);
  const out = {
    input_tokens: input,
    output_tokens: output,
    total_tokens: input + output,
  };
  if (cacheCreate !== undefined) out.cache_creation_input_tokens = cacheCreate;
  if (cacheRead !== undefined) out.cache_read_input_tokens = cacheRead;
  return out;
}

// --- helpers ---------------------------------------------------------------

// Accept either an object (SDK structured output) or a string (raw text) and
// return a plain object, or null if it can't be parsed. Tolerates a JSON object
// embedded in surrounding prose.
function coerceObject(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const v = JSON.parse(trimmed);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const v = JSON.parse(m[0]);
        return v && typeof v === "object" && !Array.isArray(v) ? v : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Coerce the hypothesis to a safe plain-text paragraph. Rejects non-strings and
// empties; strips control chars and any angle-bracket markup so nothing that
// could render as HTML is ever returned (FR-C1 criterion 4 / Section F).
function sanitizeHypothesis(value) {
  if (typeof value !== "string") return null;
  let s = value.replace(/<[^>]*>/g, " "); // drop any tags
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x1f\x7f]/g, " "); // control chars -> space
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.slice(0, 600); // one paragraph; bounded
}

function round(n) {
  return Math.round(Number(n) * 1000) / 1000;
}
function num(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}
function numOrUndef(n) {
  if (n === undefined || n === null) return undefined;
  const v = Number(n);
  return Number.isFinite(v) ? v : undefined;
}
