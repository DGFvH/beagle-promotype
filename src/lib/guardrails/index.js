// ===========================================================================
// Guardrails module — the single consumed API (Section F: FR-F1/F2/F3)
// ===========================================================================
// SECTION 0.3 — GUARDRAILS WIN. This module is the single gate every proposal and
// every injection must pass through. It SURFACES violations as structured,
// machine-readable verdicts with human-readable reasons. It NEVER:
//   - auto-rewrites a proposal to make it pass,
//   - downgrades a violation to a warning,
//   - swallows an error and allows the change.
// A guardrail evaluation that errors or receives malformed input FAILS CLOSED
// (blocks) — an unenforced guardrail is a violation (Section 6).
//
// Consumers:
//   - PROPOSAL path  (beagle-hypothesis, FR-C2): call checkProposal() before
//     surfacing a variant, and feed buildGuardrailPromptContext() / getStyleGuide()
//     into the Claude prompt so generation stays on-brand and in-bounds.
//   - INJECTION path (beagle-integrations, FR-D2): call checkProposal() again as
//     the backstop before anything is written/injected — it MUST run even if the
//     proposal path already ran (FR-F3b). Use checkInjection() for the element-id
//     enforcement the injection module needs.
//
// Storage: provideGuardrails()/loadGuardrails() in ./store.js own where guardrails
// live per project; both paths read the same store.

import { HERO_ATTRIBUTES } from "../engine.js";
import { checkLegalLimits, parseLegalLimits, COPY_ATTRIBUTES } from "./legal.js";
import { checkImmutables, parseImmutables } from "./immutables.js";
import {
  provideGuardrails,
  loadGuardrails,
  clearGuardrails,
  emptyGuardrails,
  DEFAULT_PROJECT,
} from "./store.js";

// Re-export the store + parsers so callers have one import surface.
export {
  provideGuardrails,
  loadGuardrails,
  clearGuardrails,
  emptyGuardrails,
  DEFAULT_PROJECT,
  parseLegalLimits,
  parseImmutables,
  HERO_ATTRIBUTES,
};

// Normalise whatever a caller passes as `guardrails` into the enforceable model.
// Accepts: the stored model, or raw {legalLimitsDoc, styleGuideDoc, immutables}.
function resolveGuardrails(guardrails) {
  if (!guardrails) return emptyGuardrails();
  // Already in stored/parsed shape.
  if (guardrails.legalLimits && guardrails.immutables) return guardrails;
  // Raw inputs — parse on the fly (does not persist).
  return {
    legalLimits: {
      doc: guardrails.legalLimitsDoc ?? "",
      parsed: parseLegalLimits(guardrails.legalLimitsDoc ?? ""),
    },
    styleGuide: { doc: guardrails.styleGuideDoc ?? "" },
    immutables: parseImmutables(guardrails.immutables ?? []),
  };
}

// ---------------------------------------------------------------------------
// THE GATE — checkProposal()
// ---------------------------------------------------------------------------
// checkProposal(currentConfig, proposedConfig, guardrails) -> {
//   allowed: boolean,
//   violations: [{ rule, attribute, reason, ...detail }],
//   warnings: [{ rule, reason }],   // surfaced, non-blocking (e.g. unknown immutable key)
//   summary: string,                // human-readable, for the user
// }
// Both the proposal path and the injection path call this. Identical semantics in
// both places so the injection backstop catches anything the proposal path missed.
export function checkProposal(currentConfig, proposedConfig, guardrails) {
  const violations = [];
  const warnings = [];

  try {
    const g = resolveGuardrails(guardrails);

    // --- FR-F3: immutables (deterministic attribute diff) -------------------
    if (g.immutables?.parseError) {
      // Malformed immutable list = guardrail-eval error → fail closed.
      violations.push({
        rule: "immutable",
        attribute: null,
        reason: `Immutable list could not be parsed ("${g.immutables.parseError}"); blocking to fail safe.`,
      });
    }
    if (Array.isArray(g.immutables?.unknownAttributes) && g.immutables.unknownAttributes.length) {
      for (const a of g.immutables.unknownAttributes) {
        warnings.push({
          rule: "immutable",
          reason: `Declared immutable "${a}" is not a known hero attribute (${HERO_ATTRIBUTES.join(", ")}); it cannot be enforced as an attribute. Verify the immutable list.`,
        });
      }
    }
    violations.push(...checkImmutables(currentConfig, proposedConfig, g.immutables));

    // --- FR-F1: legal limits (deterministic copy check) ---------------------
    violations.push(...checkLegalLimits(proposedConfig, g.legalLimits?.parsed, COPY_ATTRIBUTES));
  } catch (err) {
    // Any unexpected error in guardrail evaluation MUST fail closed (Section 6).
    return {
      allowed: false,
      violations: [
        {
          rule: "guardrail-error",
          attribute: null,
          reason: `Guardrail evaluation failed (${err?.message ?? "unknown error"}); blocking to fail safe.`,
        },
      ],
      warnings,
      summary: "Blocked: guardrail evaluation failed, so the change is blocked to fail safe.",
    };
  }

  const allowed = violations.length === 0;
  return {
    allowed,
    violations,
    warnings,
    summary: allowed
      ? "Allowed: no guardrail violations."
      : `Blocked by ${violations.length} guardrail violation(s): ` +
        violations.map((v) => v.reason).join(" "),
  };
}

// ---------------------------------------------------------------------------
// INJECTION BACKSTOP — checkInjection()
// ---------------------------------------------------------------------------
// The injection path (FR-D2) calls this immediately before writing/injecting. It
// re-runs the full proposal gate (so a proposal that bypassed generation is still
// caught) AND additionally rejects any attempt to touch a declared-immutable
// ELEMENT id (e.g. "site-logo"). The injection module passes the set of element
// ids its patch would alter via `touchedElements`.
//
//   checkInjection(currentConfig, proposedConfig, guardrails, { touchedElements })
export function checkInjection(currentConfig, proposedConfig, guardrails, opts = {}) {
  const base = checkProposal(currentConfig, proposedConfig, guardrails);
  const touched = Array.isArray(opts.touchedElements) ? opts.touchedElements : [];

  try {
    const g = resolveGuardrails(guardrails);
    const immutableElements = g.immutables?.elements ?? [];
    for (const el of touched) {
      if (immutableElements.includes(el)) {
        base.violations.push({
          rule: "immutable-element",
          attribute: el,
          reason: `Injection would alter element "${el}", which is on the do-not-change list.`,
        });
      }
    }
  } catch (err) {
    base.violations.push({
      rule: "guardrail-error",
      attribute: null,
      reason: `Injection guardrail evaluation failed (${err?.message ?? "unknown error"}); blocking to fail safe.`,
    });
  }

  const allowed = base.violations.length === 0;
  return {
    ...base,
    allowed,
    summary: allowed
      ? "Allowed: injection passes all guardrails."
      : `Injection blocked by ${base.violations.length} guardrail violation(s): ` +
        base.violations.map((v) => v.reason).join(" "),
  };
}

// ---------------------------------------------------------------------------
// PROMPT FEED — FR-F2b / FR-C2a / FR-F1b
// ---------------------------------------------------------------------------
// Expose the style guide + legal limits to the proposal prompt path so Claude
// generates on-brand, in-bounds variants. beagle-hypothesis includes this in the
// prompt; the deterministic checkProposal() gate is still the enforcement of record.

// Return the raw style-guide text supplied for the project (or "").
export function getStyleGuide(guardrails) {
  const g = resolveGuardrails(guardrails);
  return g.styleGuide?.doc ?? "";
}

// Return the raw legal-limits doc text (for the prompt) plus the parsed,
// enforceable rules (so the prompt can list forbidden terms explicitly).
export function getLegalLimits(guardrails) {
  const g = resolveGuardrails(guardrails);
  return { doc: g.legalLimits?.doc ?? "", parsed: g.legalLimits?.parsed ?? parseLegalLimits("") };
}

// Return the declared immutable attributes/elements (for the prompt: "never
// change these").
export function getImmutables(guardrails) {
  const g = resolveGuardrails(guardrails);
  return g.immutables ?? parseImmutables([]);
}

// Build a single prompt-ready context block the proposal path injects verbatim
// into the Claude prompt. Includes the style guide, the immutable list, and the
// explicit forbidden terms/patterns from the legal-limits doc. Returns "" when no
// guardrails are supplied (nothing to add).
export function buildGuardrailPromptContext(guardrails) {
  const g = resolveGuardrails(guardrails);
  const parts = [];

  const style = g.styleGuide?.doc?.trim();
  if (style) {
    parts.push("STYLE GUIDE (stay strictly within this — it is a hard constraint):\n" + style);
  }

  const imm = g.immutables;
  if (imm?.attributes?.length || imm?.elements?.length) {
    const lines = [];
    if (imm.attributes?.length)
      lines.push(`- Do NOT change these hero attributes: ${imm.attributes.join(", ")}.`);
    if (imm.elements?.length)
      lines.push(`- Do NOT alter these elements: ${imm.elements.join(", ")}.`);
    parts.push("IMMUTABLE / DO-NOT-CHANGE LIST (FR-F3):\n" + lines.join("\n"));
  }

  const legal = g.legalLimits?.parsed;
  if (legal?.forbiddenTerms?.length || legal?.forbiddenPatterns?.length) {
    const lines = [];
    if (legal.forbiddenTerms?.length)
      lines.push(`- Never use these forbidden terms/phrases in any copy: ${legal.forbiddenTerms.map((t) => `"${t}"`).join(", ")}.`);
    if (legal.forbiddenPatterns?.length)
      lines.push(`- Never make claims matching: ${legal.forbiddenPatterns.map((p) => `/${p.source}/`).join(", ")}.`);
    parts.push("LEGAL LIMITS (FR-F1 — these are hard constraints; violations are blocked):\n" + lines.join("\n"));
  }

  return parts.join("\n\n");
}
