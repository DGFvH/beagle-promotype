// ---------------------------------------------------------------------------
// Legal-limits parsing + enforcement (FR-F1)
// ---------------------------------------------------------------------------
// A legal-limits doc is free text, but enforcement must be DETERMINISTIC and run
// client-side on the hot path (no secret, no model call). So we extract the
// machine-enforceable rules from explicit markers and treat the rest as human
// context. The marker scheme is documented in
// references/guardrails/legal-limits.sample.md.
//
//   FORBIDDEN: <term/phrase>     -> proposed copy must not contain it (word-aware)
//   FORBIDDEN_REGEX: <pattern>   -> proposed copy must not match this regex
//
// TODO(server-side legal interpretation): interpreting free prose ("no comparative
// claims against named competitors") against a proposed change is a model call and
// MUST live server-side under api/ with the key server-side (Section 6). This module
// deliberately only enforces the deterministic markers; the richer policy engine is
// a clean seam, not built here (Section 8). Until that exists, unmarked prose is
// surfaced to reviewers, never silently treated as "passed".

// Attributes whose value is human-visible copy that legal limits apply to.
// (Kept local so this file has no hard dependency on the engine's full space;
//  index.js owns the authoritative attribute list.)
const COPY_ATTRIBUTES = ["headline", "subheadline", "ctaLabel"];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Parse a legal-limits document (string) into a structured, enforceable shape.
// Returns { forbiddenTerms: string[], forbiddenPatterns: {source,flags}[], raw }.
// Never throws on malformed input — bad regex lines are skipped and recorded.
export function parseLegalLimits(doc) {
  const result = {
    forbiddenTerms: [],
    forbiddenPatterns: [], // {source, flags} so it is serialisable/storable
    skipped: [], // lines we could not compile, surfaced for transparency
    raw: typeof doc === "string" ? doc : "",
  };
  if (typeof doc !== "string" || !doc.trim()) return result;

  for (const line of doc.split(/\r?\n/)) {
    const trimmed = line.trim();
    const termMatch = /^FORBIDDEN:\s*(.+)$/i.exec(trimmed);
    if (termMatch) {
      const term = termMatch[1].trim();
      if (term) result.forbiddenTerms.push(term);
      continue;
    }
    const reMatch = /^FORBIDDEN_REGEX:\s*(.+)$/i.exec(trimmed);
    if (reMatch) {
      const pattern = reMatch[1].trim();
      try {
        // validate it compiles; store source so it can be persisted.
        // eslint-disable-next-line no-new
        new RegExp(pattern, "i");
        result.forbiddenPatterns.push({ source: pattern, flags: "i" });
      } catch {
        result.skipped.push(pattern);
      }
      continue;
    }
  }
  return result;
}

// Build a single inspectable string of all copy in a config.
function copyValues(config, copyAttributes) {
  const attrs = copyAttributes ?? COPY_ATTRIBUTES;
  const out = [];
  for (const key of attrs) {
    const v = config?.[key];
    if (typeof v === "string" && v.trim()) out.push({ attribute: key, text: v });
  }
  return out;
}

// Check a proposed config's copy against parsed legal limits.
// Returns an array of violation objects (empty = clean):
//   { rule: "legal-limit", attribute, reason, term|pattern }
// `parsed` is the output of parseLegalLimits (or a stored equivalent).
export function checkLegalLimits(proposedConfig, parsed, copyAttributes) {
  const violations = [];
  if (!parsed) return violations;

  const terms = Array.isArray(parsed.forbiddenTerms) ? parsed.forbiddenTerms : [];
  const patterns = Array.isArray(parsed.forbiddenPatterns) ? parsed.forbiddenPatterns : [];
  const fields = copyValues(proposedConfig, copyAttributes);

  for (const { attribute, text } of fields) {
    for (const term of terms) {
      // word-boundary-aware, case-insensitive containment.
      const re = new RegExp(`(^|\\W)${escapeRegExp(term)}(\\W|$)`, "i");
      if (re.test(text)) {
        violations.push({
          rule: "legal-limit",
          attribute,
          reason: `Proposed ${attribute} contains forbidden term "${term}" (legal limit).`,
          term,
        });
      }
    }
    for (const p of patterns) {
      let re;
      try {
        re = new RegExp(p.source, p.flags || "i");
      } catch {
        // A stored pattern that no longer compiles is a guardrail-eval error:
        // fail closed (Section 6) — surface as a violation, do not skip silently.
        violations.push({
          rule: "legal-limit",
          attribute,
          reason: `Legal-limit pattern "${p.source}" could not be evaluated; blocking to fail safe.`,
          pattern: p.source,
        });
        continue;
      }
      if (re.test(text)) {
        violations.push({
          rule: "legal-limit",
          attribute,
          reason: `Proposed ${attribute} matches forbidden claim pattern /${p.source}/ (legal limit).`,
          pattern: p.source,
        });
      }
    }
  }
  return violations;
}

export { COPY_ATTRIBUTES };
