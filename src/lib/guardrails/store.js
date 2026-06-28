// ---------------------------------------------------------------------------
// Guardrails store / loader (FR-F1a, FR-F2a, FR-F3a — "user can provide")
// ---------------------------------------------------------------------------
// The guardrails data model is:
//   { legalLimits: { doc, parsed }, styleGuide: { doc }, immutables: parsed }
// It is associated with a project and must be readable by BOTH the proposal path
// and the injection path. This module owns providing/storing/loading it.
//
// In the MVP there is no backend; guardrails are held in an in-memory project
// store (keyed by projectId) that the UI sets and both paths read. The shape and
// the provide/load functions are stable; a real persistence layer (file/db) slots
// in behind loadGuardrails/saveGuardrails without changing callers.
//
// TODO(beagle-ui-ux): build the upload UI that calls provideGuardrails() with the
// three docs (legal-limits text, style-guide text, immutable list). This module
// intentionally does NOT build UI — it exposes the contract.

import { parseLegalLimits } from "./legal.js";
import { parseImmutables } from "./immutables.js";

const DEFAULT_PROJECT = "__default__";
const _projects = new Map(); // projectId -> guardrails

// An empty guardrail set = no constraints supplied yet. NOTE: empty means
// "nothing to enforce", which is different from a guardrail that errors (that
// fails closed — see index.checkProposal). Empty is a legitimate starting state.
export function emptyGuardrails() {
  return {
    legalLimits: { doc: "", parsed: parseLegalLimits("") },
    styleGuide: { doc: "" },
    immutables: parseImmutables([]),
  };
}

// Provide/replace guardrails for a project. Accepts the raw user-supplied inputs
// and parses them into the enforceable model. Any field omitted is left empty.
//   provideGuardrails({ projectId, legalLimitsDoc, styleGuideDoc, immutables })
// `immutables` may be an array, a {attributes,elements} object, or a JSON string.
export function provideGuardrails({
  projectId = DEFAULT_PROJECT,
  legalLimitsDoc = "",
  styleGuideDoc = "",
  immutables = [],
} = {}) {
  let immutableInput = immutables;
  if (typeof immutables === "string") {
    try {
      immutableInput = JSON.parse(immutables);
    } catch {
      // A malformed immutable list is a guardrail-config error. Do NOT silently
      // drop it to an empty list (that would disable the guardrail). Record it so
      // enforcement can fail closed and the UI can surface the problem.
      const g = {
        ...emptyGuardrails(),
        immutables: { attributes: [], elements: [], unknownAttributes: [], parseError: String(immutables).slice(0, 200) },
        legalLimits: { doc: legalLimitsDoc, parsed: parseLegalLimits(legalLimitsDoc) },
        styleGuide: { doc: styleGuideDoc },
      };
      _projects.set(projectId, g);
      return g;
    }
  }

  const guardrails = {
    legalLimits: { doc: legalLimitsDoc, parsed: parseLegalLimits(legalLimitsDoc) },
    styleGuide: { doc: styleGuideDoc },
    immutables: parseImmutables(immutableInput),
  };
  _projects.set(projectId, guardrails);
  return guardrails;
}

// Load the guardrails for a project (empty set if none provided).
export function loadGuardrails(projectId = DEFAULT_PROJECT) {
  return _projects.get(projectId) ?? emptyGuardrails();
}

// Clear stored guardrails (mostly for tests / project reset).
export function clearGuardrails(projectId = DEFAULT_PROJECT) {
  if (projectId === undefined) _projects.clear();
  else _projects.delete(projectId);
}

export { DEFAULT_PROJECT };
