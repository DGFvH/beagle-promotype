// ---------------------------------------------------------------------------
// Do-not-change / immutable enforcement (FR-F3)
// ---------------------------------------------------------------------------
// The immutable list names hero attributes (and/or forward-looking element ids)
// the user has declared must NEVER change. Enforcement is purely deterministic
// (an attribute diff), so it is safe to run client-side AND it is re-run at
// injection time as the backstop (FR-F3b: "injection enforces this even if a
// proposal slips through").
//
// Data shape (see references/guardrails/immutables.sample.json):
//   { attributes: string[], elements: string[] }
// `attributes` are hero attribute keys from HERO_ATTRIBUTES. `elements` are
// DOM/element identifiers the injection path must never alter — recorded here so
// the injection module (beagle-integrations, FR-D2) can enforce them structurally.

import { HERO_ATTRIBUTES } from "../engine.js";

// Normalise an immutable list from config or a parsed JSON file into the canon
// shape. Tolerant of: an array (treated as attributes), or {attributes,elements}.
// Unknown attribute keys are kept but flagged so the UI can warn (a typo'd
// immutable must not silently become a no-op guardrail — that would be unsafe).
export function parseImmutables(raw) {
  let attributes = [];
  let elements = [];

  if (Array.isArray(raw)) {
    attributes = raw;
  } else if (raw && typeof raw === "object") {
    if (Array.isArray(raw.attributes)) attributes = raw.attributes;
    if (Array.isArray(raw.elements)) elements = raw.elements;
  }

  attributes = attributes.filter((a) => typeof a === "string" && a.trim()).map((a) => a.trim());
  elements = elements.filter((e) => typeof e === "string" && e.trim()).map((e) => e.trim());

  const unknownAttributes = attributes.filter((a) => !HERO_ATTRIBUTES.includes(a));

  return { attributes, elements, unknownAttributes };
}

// Check a proposed config against the current (champion) config for any change to
// a declared-immutable attribute. Returns violation objects (empty = clean):
//   { rule: "immutable", attribute, reason, from, to }
//
// `immutables` is the parsed shape (or anything parseImmutables accepts).
export function checkImmutables(currentConfig, proposedConfig, immutables) {
  const parsed = immutables && immutables.attributes ? immutables : parseImmutables(immutables);
  const violations = [];

  for (const attr of parsed.attributes) {
    // Compare against the current hero. If there is no current value we still
    // treat any concrete proposed value for an immutable as a change to surface.
    const from = currentConfig?.[attr];
    const to = proposedConfig?.[attr];
    if (to !== undefined && from !== to) {
      violations.push({
        rule: "immutable",
        attribute: attr,
        reason: `"${attr}" is on the do-not-change list and may not be modified (was "${from}", proposed "${to}").`,
        from,
        to,
      });
    }
  }
  return violations;
}
