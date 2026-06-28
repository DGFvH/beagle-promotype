// Tests for the Claude hero-proposal core (api/_lib/proposal.js).
// Covers the `auto` acceptance criteria for FR-C1, FR-C2, FR-E1 without any
// network or live key: prompt-build (design system + metric + hero reach the
// prompt), output validation/sanitisation + graceful fallback on malformed
// output (never raw markup), guardrail blocking, the both-fields contract, and
// token-usage capture.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  buildProposalPrompt,
  sanitizeProposal,
  extractUsage,
  PROPOSAL_JSON_SCHEMA,
} from "../../../api/_lib/proposal.js";
import { defaultHeroConfig, isValidHeroConfig, HERO_ATTRIBUTES } from "../engine.js";
import { provideGuardrails, clearGuardrails } from "../guardrails/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ref = (p) => resolve(__dirname, "../../../references", p);
const STYLE_DOC = readFileSync(ref("design-system/style-guide.sample.md"), "utf8");
const LEGAL_DOC = readFileSync(ref("guardrails/legal-limits.sample.md"), "utf8");
const IMMUTABLES = JSON.parse(readFileSync(ref("guardrails/immutables.sample.json"), "utf8"));

const HERO = defaultHeroConfig();

// A variant that differs from the default hero on a NON-immutable attribute.
function validVariant(overrides = {}) {
  return { ...HERO, ctaLabel: "Book a demo", ...overrides };
}

describe("FR-C2a — design system reaches the proposal prompt", () => {
  it("includes the supplied style guide text in the prompt", () => {
    const guardrails = provideGuardrails({
      projectId: "proposal-test",
      styleGuideDoc: STYLE_DOC,
      immutables: IMMUTABLES,
    });
    const { user, styleGuide } = buildProposalPrompt({
      current: HERO,
      goal: "ctr",
      history: [],
      guardrails,
    });
    // The style guide is surfaced for generation...
    expect(styleGuide).toBe(STYLE_DOC);
    // ...and a recognisable chunk of it is embedded in the actual prompt text.
    const probe = STYLE_DOC.split(/\r?\n/).find((l) => l.trim().length > 12).trim();
    expect(user).toContain(probe);
    // The immutable list (part of the design system) is also referenced.
    expect(user).toMatch(/IMMUTABLE|DO-NOT-CHANGE/i);
    expect(user).toContain("headline"); // the declared-immutable attribute
    clearGuardrails("proposal-test");
  });
});

describe("FR-C1a — prompt includes the chosen metric and the current hero", () => {
  it("names the direction-aware metric for each goal", () => {
    const ctr = buildProposalPrompt({ current: HERO, goal: "ctr", history: [] });
    expect(ctr.user).toMatch(/click-through/i);
    expect(ctr.user).toMatch(/higher is better/i);

    const tta = buildProposalPrompt({ current: HERO, goal: "timeToAction", history: [] });
    expect(tta.user).toMatch(/time-to-action/i);
    expect(tta.user).toMatch(/lower is better/i);
  });

  it("embeds the current hero config and the full enum design space", () => {
    const { user } = buildProposalPrompt({ current: HERO, goal: "conversion", history: [] });
    expect(user).toMatch(/CURRENT HERO/i);
    expect(user).toMatch(/HERO DESIGN SPACE/i);
    // Every hero attribute key appears in the prompt.
    for (const key of HERO_ATTRIBUTES) {
      expect(user).toContain(key);
    }
    // The current headline value is present.
    expect(user).toContain(HERO.headline);
  });
});

describe("FR-C1b — proposal carries BOTH a concrete variant AND a hypothesis", () => {
  it("returns a valid hero variant and a non-empty hypothesis string", () => {
    const out = sanitizeProposal(
      {
        variant: validVariant(),
        hypothesis:
          "Switching the primary CTA label to 'Book a demo' should raise CTR by giving a clearer next step.",
      },
      { current: HERO, goal: "ctr", guardrails: null }
    );
    expect(out.ok).toBe(true);
    expect(isValidHeroConfig(out.variant)).toBe(true);
    expect(typeof out.hypothesis).toBe("string");
    expect(out.hypothesis.trim().length).toBeGreaterThan(0);
    // The diff vs current hero is present for the approval UI (FR-C1c).
    expect(Array.isArray(out.diff)).toBe(true);
    expect(out.diff).toEqual([
      expect.objectContaining({ attribute: "ctaLabel", from: "Get started", to: "Book a demo" }),
    ]);
  });

  it("accepts a JSON string payload (lenient parsing) too", () => {
    const raw = JSON.stringify({ variant: validVariant(), hypothesis: "A clear hypothesis paragraph." });
    const out = sanitizeProposal(raw, { current: HERO, goal: "ctr" });
    expect(out.ok).toBe(true);
    expect(out.hypothesis).toContain("clear hypothesis");
  });
});

describe("FR-C1d — malformed output falls back gracefully, never raw markup", () => {
  const currentOpts = { current: HERO, goal: "ctr", guardrails: null };

  it("rejects non-JSON garbage", () => {
    const out = sanitizeProposal("totally not json", currentOpts);
    expect(out.ok).toBe(false);
    expect(out.blocked).toBe(false);
    expect(out.variant).toBeUndefined();
  });

  it("rejects a variant outside the hero design space", () => {
    const out = sanitizeProposal(
      { variant: { ...HERO, ctaLabel: "<script>alert(1)</script>" }, hypothesis: "x" },
      currentOpts
    );
    expect(out.ok).toBe(false);
    expect(out.blocked).toBe(false);
  });

  it("rejects a partial/missing variant", () => {
    const out = sanitizeProposal({ variant: { ctaLabel: "Book a demo" }, hypothesis: "x" }, currentOpts);
    expect(out.ok).toBe(false);
  });

  it("rejects a missing hypothesis even when the variant is valid", () => {
    const out = sanitizeProposal({ variant: validVariant() }, currentOpts);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/hypothesis/i);
  });

  it("strips any HTML/markup out of the hypothesis (never returns raw markup)", () => {
    const out = sanitizeProposal(
      {
        variant: validVariant(),
        hypothesis: "Raise CTR <img src=x onerror=alert(1)> with a clearer CTA.",
      },
      currentOpts
    );
    expect(out.ok).toBe(true);
    expect(out.hypothesis).not.toMatch(/[<>]/);
    expect(out.hypothesis).not.toMatch(/onerror/i);
    expect(out.hypothesis).toMatch(/clearer CTA/i);
  });
});

describe("FR-C2 / FR-F — a guardrail-violating variant is blocked with a reason", () => {
  it("blocks a proposal that changes a declared-immutable attribute (FR-F3)", () => {
    const guardrails = provideGuardrails({
      projectId: "block-immutable",
      immutables: IMMUTABLES, // headline is immutable
    });
    // Change the immutable headline -> must be blocked, not returned approved.
    const out = sanitizeProposal(
      {
        variant: { ...HERO, headline: "Turn visitors into customers" },
        hypothesis: "A punchier headline should lift CTR.",
      },
      { current: HERO, goal: "ctr", guardrails }
    );
    expect(out.ok).toBe(false);
    expect(out.blocked).toBe(true);
    expect(out.reason).toMatch(/blocked/i);
    expect(out.violations.length).toBeGreaterThan(0);
    expect(out.violations.some((v) => v.rule === "immutable")).toBe(true);
    clearGuardrails("block-immutable");
  });

  it("blocks a proposal whose copy contains a forbidden legal term (FR-F1)", () => {
    // Forbid a word that appears in a real CTA option ("demo" -> "Book a demo").
    const guardrails = provideGuardrails({
      projectId: "block-legal",
      legalLimitsDoc: "FORBIDDEN: demo",
    });
    const out = sanitizeProposal(
      { variant: validVariant(), hypothesis: "Trying the demo CTA to lift CTR." },
      { current: HERO, goal: "ctr", guardrails }
    );
    expect(out.ok).toBe(false);
    expect(out.blocked).toBe(true);
    expect(out.violations.some((v) => v.rule === "legal-limit")).toBe(true);
    clearGuardrails("block-legal");
  });

  it("does not return an approved variant when blocked (guardrails win)", () => {
    const guardrails = provideGuardrails({ projectId: "win", immutables: IMMUTABLES });
    const out = sanitizeProposal(
      { variant: { ...HERO, headline: "Ship a hero that converts" }, hypothesis: "p" },
      { current: HERO, goal: "ctr", guardrails }
    );
    expect(out.ok).not.toBe(true);
    clearGuardrails("win");
  });
});

describe("FR-E1 — token usage is captured and normalised", () => {
  it("totals input + output tokens from a successful usage block", () => {
    const usage = extractUsage({
      input_tokens: 1234,
      output_tokens: 567,
      cache_read_input_tokens: 100,
    });
    expect(usage.input_tokens).toBe(1234);
    expect(usage.output_tokens).toBe(567);
    expect(usage.total_tokens).toBe(1234 + 567);
    expect(usage.cache_read_input_tokens).toBe(100);
  });

  it("never throws on a missing/garbage usage block", () => {
    expect(extractUsage(undefined)).toEqual({ input_tokens: 0, output_tokens: 0, total_tokens: 0 });
    expect(extractUsage(null).total_tokens).toBe(0);
    expect(extractUsage({ input_tokens: "x" }).input_tokens).toBe(0);
  });
});

describe("structured-output schema is enum-constrained (Section 8)", () => {
  it("constrains each variant attribute to its design-space options", () => {
    const props = PROPOSAL_JSON_SCHEMA.properties.variant.properties;
    for (const key of HERO_ATTRIBUTES) {
      expect(Array.isArray(props[key].enum)).toBe(true);
      expect(props[key].enum.length).toBeGreaterThan(0);
    }
    expect(PROPOSAL_JSON_SCHEMA.required).toContain("variant");
    expect(PROPOSAL_JSON_SCHEMA.required).toContain("hypothesis");
  });
});
