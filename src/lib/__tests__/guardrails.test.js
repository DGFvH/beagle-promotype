import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  checkProposal,
  checkInjection,
  getStyleGuide,
  getLegalLimits,
  getImmutables,
  buildGuardrailPromptContext,
  provideGuardrails,
  loadGuardrails,
  clearGuardrails,
  parseLegalLimits,
} from "../guardrails/index.js";
import { defaultHeroConfig } from "../engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ref = (p) => resolve(__dirname, "../../../references", p);

const LEGAL_DOC = readFileSync(ref("guardrails/legal-limits.sample.md"), "utf8");
const STYLE_DOC = readFileSync(ref("design-system/style-guide.sample.md"), "utf8");
const IMMUTABLES = JSON.parse(readFileSync(ref("guardrails/immutables.sample.json"), "utf8"));

// A guardrail set from the sample fixtures: immutable headline + legal forbidden terms.
function sampleGuardrails(projectId = "test-project") {
  return provideGuardrails({
    projectId,
    legalLimitsDoc: LEGAL_DOC,
    styleGuideDoc: STYLE_DOC,
    immutables: IMMUTABLES, // { attributes: ["headline"], elements: [...] }
  });
}

beforeEach(() => clearGuardrails(undefined)); // wipe all projects between tests

// ---------------------------------------------------------------------------
// FR-F1b / FR-F2b — guardrails are providable + retrievable for prompt + decisions
// ---------------------------------------------------------------------------
describe("FR-F1/F2/F3 (a) — user can provide guardrails, stored against the project", () => {
  it("provideGuardrails stores and loadGuardrails reads them back per project", () => {
    sampleGuardrails("proj-A");
    const loaded = loadGuardrails("proj-A");
    expect(loaded.styleGuide.doc).toContain("Style guide");
    expect(loaded.immutables.attributes).toContain("headline");
    expect(loaded.legalLimits.parsed.forbiddenTerms.length).toBeGreaterThan(0);
  });

  it("an unprovided project yields an empty (no-constraint) guardrail set", () => {
    const loaded = loadGuardrails("never-set");
    expect(loaded.immutables.attributes).toEqual([]);
    expect(loaded.legalLimits.parsed.forbiddenTerms).toEqual([]);
  });
});

describe("FR-F2b / FR-F1b — style guide + legal limits feed the proposal prompt", () => {
  it("getStyleGuide returns the supplied style-guide text (for FR-C2 generation)", () => {
    const g = sampleGuardrails();
    expect(getStyleGuide(g)).toBe(STYLE_DOC);
    expect(getStyleGuide(g)).toContain("Voice & tone");
  });

  it("getLegalLimits exposes raw doc + parsed forbidden terms", () => {
    const g = sampleGuardrails();
    const { doc, parsed } = getLegalLimits(g);
    expect(doc).toBe(LEGAL_DOC);
    expect(parsed.forbiddenTerms).toContain("guaranteed");
  });

  it("getImmutables exposes the declared do-not-change list", () => {
    const g = sampleGuardrails();
    expect(getImmutables(g).attributes).toContain("headline");
  });

  it("buildGuardrailPromptContext includes style guide, immutables, and legal limits", () => {
    const ctx = buildGuardrailPromptContext(sampleGuardrails());
    expect(ctx).toContain("STYLE GUIDE");
    expect(ctx).toContain("IMMUTABLE");
    expect(ctx).toContain("headline");
    expect(ctx).toContain("LEGAL LIMITS");
    expect(ctx).toContain("guaranteed");
  });

  it("buildGuardrailPromptContext is empty when no guardrails are supplied", () => {
    expect(buildGuardrailPromptContext(undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// FR-F1c — legal-limit violations are BLOCKED and surfaced, never overridden
// ---------------------------------------------------------------------------
describe("FR-F1c — legal-limit violation is blocked with a surfaced reason", () => {
  it("blocks a proposal whose copy contains a forbidden term", () => {
    const g = sampleGuardrails();
    const current = defaultHeroConfig();
    // ctaLabel and subheadline are NOT immutable, so this isolates the legal check.
    const proposed = { ...current, subheadline: "Results guaranteed for every visitor." };

    const verdict = checkProposal(current, proposed, g);
    expect(verdict.allowed).toBe(false);
    const legal = verdict.violations.find((v) => v.rule === "legal-limit");
    expect(legal).toBeTruthy();
    expect(legal.reason).toMatch(/forbidden term "guaranteed"/i);
    expect(verdict.summary).toMatch(/Blocked/);
  });

  it("blocks a proposal that matches a forbidden claim PATTERN", () => {
    const g = sampleGuardrails();
    const current = defaultHeroConfig();
    const proposed = { ...current, subheadline: "Get 50% more conversion overnight." };
    const verdict = checkProposal(current, proposed, g);
    expect(verdict.allowed).toBe(false);
    expect(verdict.violations.some((v) => v.rule === "legal-limit" && v.pattern)).toBe(true);
  });

  it("does not auto-rewrite or downgrade — the proposed value is untouched and it stays blocked", () => {
    const g = sampleGuardrails();
    const current = defaultHeroConfig();
    const proposed = { ...current, ctaLabel: "Risk-free trial" }; // ctaLabel is copy, not immutable
    const verdict = checkProposal(current, proposed, g);
    expect(verdict.allowed).toBe(false);
    expect(proposed.ctaLabel).toBe("Risk-free trial"); // never silently rewritten
  });
});

// ---------------------------------------------------------------------------
// FR-F3c — a proposal that touches an immutable is rejected with a clear reason
// ---------------------------------------------------------------------------
describe("FR-F3c — changing an immutable attribute is rejected", () => {
  it("rejects a proposal that changes the immutable headline", () => {
    const g = sampleGuardrails();
    const current = defaultHeroConfig();
    const proposed = { ...current, headline: "Turn visitors into customers" };
    const verdict = checkProposal(current, proposed, g);
    expect(verdict.allowed).toBe(false);
    const imm = verdict.violations.find((v) => v.rule === "immutable");
    expect(imm).toBeTruthy();
    expect(imm.attribute).toBe("headline");
    expect(imm.reason).toMatch(/do-not-change list/i);
  });

  it("allows changing a non-immutable attribute (e.g. layout)", () => {
    const g = sampleGuardrails();
    const current = defaultHeroConfig();
    const proposed = { ...current, layout: "center" };
    const verdict = checkProposal(current, proposed, g);
    expect(verdict.allowed).toBe(true);
    expect(verdict.violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// FR-F3b — injection enforces immutables even if a proposal slipped through
// ---------------------------------------------------------------------------
describe("FR-F3b — injection-time backstop", () => {
  it("checkInjection re-runs the full gate and catches an immutable-attribute change", () => {
    const g = sampleGuardrails();
    const current = defaultHeroConfig();
    // Simulate a proposal that bypassed generation and now reaches injection.
    const slipped = { ...current, headline: "Ship a hero that converts" };
    const verdict = checkInjection(current, slipped, g, { touchedElements: [] });
    expect(verdict.allowed).toBe(false);
    expect(verdict.violations.some((v) => v.rule === "immutable" && v.attribute === "headline")).toBe(true);
  });

  it("checkInjection rejects altering a declared-immutable ELEMENT id", () => {
    const g = sampleGuardrails();
    const current = defaultHeroConfig();
    const cleanProposal = { ...current, layout: "split" }; // attribute-clean
    const verdict = checkInjection(current, cleanProposal, g, {
      touchedElements: ["site-logo"], // on the immutable elements list
    });
    expect(verdict.allowed).toBe(false);
    expect(verdict.violations.some((v) => v.rule === "immutable-element")).toBe(true);
  });

  it("checkInjection allows a fully clean injection", () => {
    const g = sampleGuardrails();
    const current = defaultHeroConfig();
    const cleanProposal = { ...current, layout: "split", ctaStyle: "outline" };
    const verdict = checkInjection(current, cleanProposal, g, { touchedElements: ["hero-cta"] });
    expect(verdict.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FR-F1b/F3b — guardrails are passed into every decision and constrain them;
// a clean proposal passes.
// ---------------------------------------------------------------------------
describe("clean proposal + no-guardrails behaviour", () => {
  it("a clean in-bounds proposal is allowed", () => {
    const g = sampleGuardrails();
    const current = defaultHeroConfig();
    const proposed = { ...current, ctaLabel: "Book a demo", media: "screenshot" };
    const verdict = checkProposal(current, proposed, g);
    expect(verdict.allowed).toBe(true);
    expect(verdict.summary).toMatch(/Allowed/);
  });

  it("with no guardrails supplied, nothing to enforce → allowed (empty != error)", () => {
    const current = defaultHeroConfig();
    const proposed = { ...current, headline: "Turn visitors into customers" };
    const verdict = checkProposal(current, proposed, undefined);
    expect(verdict.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Section 6 — fail closed on malformed / erroring guardrails
// ---------------------------------------------------------------------------
describe("Section 6 — guardrails fail closed", () => {
  it("a malformed immutable JSON string fails closed (blocks), not silently disabled", () => {
    const g = provideGuardrails({
      projectId: "broken",
      immutables: "{not valid json",
    });
    const verdict = checkProposal(defaultHeroConfig(), { ...defaultHeroConfig(), layout: "center" }, g);
    expect(verdict.allowed).toBe(false);
    expect(verdict.violations.some((v) => v.reason.match(/fail safe/i))).toBe(true);
  });

  it("an unknown immutable attribute is surfaced as a warning (not silently a no-op)", () => {
    const g = provideGuardrails({ projectId: "warn", immutables: ["notAnAttribute"] });
    const verdict = checkProposal(defaultHeroConfig(), defaultHeroConfig(), g);
    expect(verdict.warnings.some((w) => w.reason.match(/not a known hero attribute/i))).toBe(true);
  });

  it("an uncompilable stored legal pattern fails closed on the affected copy", () => {
    // Hand-craft a parsed legal-limit with a broken stored pattern source.
    const broken = {
      legalLimits: { doc: "", parsed: { forbiddenTerms: [], forbiddenPatterns: [{ source: "([", flags: "i" }] } },
      immutables: { attributes: [], elements: [], unknownAttributes: [] },
      styleGuide: { doc: "" },
    };
    const verdict = checkProposal(defaultHeroConfig(), defaultHeroConfig(), broken);
    expect(verdict.allowed).toBe(false);
    expect(verdict.violations.some((v) => v.reason.match(/fail safe/i))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Parser unit coverage (documents the marker scheme)
// ---------------------------------------------------------------------------
describe("parseLegalLimits marker scheme", () => {
  it("extracts FORBIDDEN terms and FORBIDDEN_REGEX patterns, ignoring prose", () => {
    const parsed = parseLegalLimits(
      "Some human prose here.\nFORBIDDEN: guaranteed\nFORBIDDEN_REGEX: \\bfree money\\b\nMore prose."
    );
    expect(parsed.forbiddenTerms).toEqual(["guaranteed"]);
    expect(parsed.forbiddenPatterns).toHaveLength(1);
    expect(parsed.forbiddenPatterns[0].source).toBe("\\bfree money\\b");
  });

  it("records an uncompilable regex line in skipped, does not throw", () => {
    const parsed = parseLegalLimits("FORBIDDEN_REGEX: ([");
    expect(parsed.forbiddenPatterns).toEqual([]);
    expect(parsed.skipped).toContain("([");
  });
});
