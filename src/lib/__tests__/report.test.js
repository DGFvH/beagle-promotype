// Tests for the Claude PowerPoint-report core (api/_lib/report.js).
// Covers the `auto` acceptance criteria for FR-G3 (+ FR-E1) without any network
// or live key:
//   - the prompt includes the run summary + the supplied style guide (FR-G3b)
//   - the deck-spec validator clamps/rejects malformed Claude output (FR-G3b safety)
//   - the renderer produces a valid, openable .pptx (zip with [Content_Types].xml
//     and ppt/presentation.xml) — for both a Claude spec and the fallback (FR-G3c)
//   - the fallback path yields a valid .pptx with no key, never fabricated (Section 6)
//   - token usage capture mirrors the proposal route (FR-E1)

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  buildReportPrompt,
  sanitizeDeckSpec,
  buildFallbackDeckSpec,
  renderDeck,
  extractUsage,
  normalizeSummary,
  DECK_JSON_SCHEMA,
} from "../../../api/_lib/report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ref = (p) => resolve(__dirname, "../../../references", p);
const STYLE_DOC = readFileSync(ref("design-system/style-guide.sample.md"), "utf8");

// A representative concluded-test run summary (built the same way the Dashboard
// trigger builds it from the FR-G1 verdict + FR-G2 segmentAnalysis).
const SUMMARY = {
  title: "Hero A/B test report — Click-through rate",
  hypothesis:
    "Switching the CTA to an action-first label will lift click-through rate.",
  verdict: "confirmed",
  verdictReason:
    "Challenger leads on CTR (4.8% vs 4.1%) at 92% confidence.",
  metric: { label: "Click-through rate (CTR)" },
  metricMovement: {
    championLabel: "Champion",
    challengerLabel: "Challenger",
    championValue: 0.041,
    challengerValue: 0.048,
    championDisplay: "4.1%",
    challengerDisplay: "4.8%",
    deltaDisplay: "+17.1% vs champion",
  },
  segments: [
    { segmentLabel: "Social", winnerLabel: "Challenger", divergesFromAggregate: false },
    { segmentLabel: "Search", winnerLabel: "Champion", divergesFromAggregate: true },
  ],
  confidence: { pct: 92, label: "rough indicator (not a production p-value)" },
  styleGuide: STYLE_DOC,
};

// Scan the .pptx buffer for the zip entry filenames that prove it's a valid,
// openable OOXML package. Zip stores filenames in local file headers as UTF-8,
// so they're literally present in the bytes.
function isValidPptx(buffer) {
  expect(buffer).toBeTruthy();
  const bytes = Buffer.from(buffer);
  // ZIP local-file-header magic "PK\x03\x04".
  const pk = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const str = bytes.toString("latin1");
  return (
    pk &&
    str.includes("[Content_Types].xml") &&
    str.includes("ppt/presentation.xml")
  );
}

describe("FR-G3b — the prompt carries the run summary + style guide", () => {
  it("includes the hypothesis, decision, metric movement and segment findings", () => {
    const { user } = buildReportPrompt(SUMMARY);
    expect(user).toContain(SUMMARY.hypothesis);
    expect(user).toMatch(/CONFIRMED/);
    expect(user).toContain("Click-through rate (CTR)");
    expect(user).toContain("4.1%");
    expect(user).toContain("4.8%");
    // FR-G2 findings reach the prompt, including the divergence flag.
    expect(user).toContain("Social");
    expect(user).toContain("Search");
    expect(user).toMatch(/DIVERGES/);
  });

  it("embeds the supplied style guide text (FR-F2) so the deck can follow it", () => {
    const { user, styleGuide } = buildReportPrompt(SUMMARY);
    expect(styleGuide).toBe(STYLE_DOC.trim());
    const probe = STYLE_DOC.split(/\r?\n/).find((l) => l.trim().length > 12).trim();
    expect(user).toContain(probe);
    expect(user).toMatch(/STYLE GUIDE/i);
  });

  it("still builds a coherent prompt when no style guide is supplied", () => {
    const { user, styleGuide } = buildReportPrompt({ ...SUMMARY, styleGuide: "" });
    expect(styleGuide).toBe("");
    expect(user).toMatch(/none supplied/i);
    expect(user).toContain(SUMMARY.hypothesis);
  });

  it("exposes a deck JSON schema constraining slides + style", () => {
    expect(DECK_JSON_SCHEMA.required).toContain("slides");
    expect(DECK_JSON_SCHEMA.required).toContain("style");
    expect(DECK_JSON_SCHEMA.properties.slides.type).toBe("array");
  });
});

describe("FR-G3b safety — deck-spec validator clamps/rejects malformed output", () => {
  it("accepts and sanitises a well-formed Claude spec", () => {
    const spec = sanitizeDeckSpec({
      title: "Quarterly hero test",
      subtitle: "CTR result",
      style: {
        primaryColor: "#1A1A1A",
        accentColor: "#C2410C",
        backgroundColor: "#F4F1EA",
        fontFamily: "Georgia",
        tone: "confident",
      },
      slides: [
        { layout: "title", title: "Hero A/B test", notes: "Intro" },
        {
          layout: "metric",
          title: "CTR moved up",
          metricCallout: { label: "CTR", value: "4.8%", delta: "+17%" },
          bullets: ["Champion 4.1%", "Challenger 4.8%"],
        },
      ],
    });
    expect(spec).toBeTruthy();
    expect(spec.title).toBe("Quarterly hero test");
    expect(spec.slides).toHaveLength(2);
    expect(spec.style.fontFamily).toBe("Georgia");
    // Hex normalised to 6-digit, no '#'.
    expect(spec.style.accentColor).toBe("C2410C");
  });

  it("strips markup from text fields — never returns unvalidated content", () => {
    const spec = sanitizeDeckSpec({
      title: "Report <script>alert(1)</script> deck",
      style: {},
      slides: [
        {
          layout: "bullets",
          title: "Findings <b>bold</b>",
          bullets: ["<img src=x onerror=alert(1)>danger", "ok bullet"],
          notes: "notes <iframe></iframe> here",
        },
      ],
    });
    expect(spec).toBeTruthy();
    expect(spec.title).not.toMatch(/[<>]/);
    expect(spec.slides[0].title).not.toMatch(/[<>]/);
    for (const b of spec.slides[0].bullets) expect(b).not.toMatch(/[<>]/);
    expect(spec.slides[0].notes).not.toMatch(/[<>]/);
  });

  it("rejects junk that cannot become a deck (returns null -> caller falls back)", () => {
    expect(sanitizeDeckSpec("not json at all")).toBeNull();
    expect(sanitizeDeckSpec("")).toBeNull();
    expect(sanitizeDeckSpec(null)).toBeNull();
    expect(sanitizeDeckSpec({ slides: [] })).toBeNull(); // no title
    expect(sanitizeDeckSpec({ title: "x", slides: [] })).toBeNull(); // no usable slides
    expect(sanitizeDeckSpec({ title: "x", slides: [{ foo: "bar" }] })).toBeNull(); // slides w/o title
  });

  it("coerces a bad layout to a safe default and bounds arrays", () => {
    const spec = sanitizeDeckSpec({
      title: "T",
      style: { primaryColor: "nothex", fontFamily: "Comic Sans Evil" },
      slides: [
        { layout: "totally-made-up", title: "S", bullets: Array(50).fill("b") },
      ],
    });
    expect(spec.slides[0].layout).toBe("bullets");
    expect(spec.slides[0].bullets.length).toBeLessThanOrEqual(8);
    // Invalid hex and unknown font fall back to safe defaults.
    expect(spec.style.primaryColor).toMatch(/^[0-9A-F]{6}$/);
    expect(spec.style.fontFamily).not.toMatch(/Comic Sans Evil/);
  });
});

describe("FR-G3c — renderer produces a valid, openable .pptx", () => {
  it("renders a sanitised Claude spec to a valid OOXML .pptx", async () => {
    const spec = sanitizeDeckSpec({
      title: "Hero test deck",
      style: {
        primaryColor: "#1A1A1A",
        accentColor: "#C2410C",
        backgroundColor: "#FFFFFF",
        fontFamily: "Georgia",
        tone: "confident",
      },
      slides: [
        { layout: "title", title: "Hero A/B test report", notes: "Title slide" },
        {
          layout: "metric",
          title: "CTR",
          metricCallout: { label: "CTR", value: "4.8%", delta: "+17%" },
        },
        {
          layout: "segments",
          title: "Segments",
          segments: [{ segment: "Social", winner: "Challenger", note: "match" }],
        },
        { layout: "closing", title: "Recommendation", bullets: ["Roll out"] },
      ],
    });
    const buffer = await renderDeck(spec);
    expect(isValidPptx(buffer)).toBe(true);
  });
});

describe("FR-G3 fallback (Section 6) — deterministic deck with no Claude", () => {
  it("builds a fallback spec from the run summary, labelled 'without Claude'", () => {
    const spec = buildFallbackDeckSpec(SUMMARY);
    expect(spec.title).toContain("Click-through rate");
    expect(spec.slides.length).toBeGreaterThanOrEqual(4);
    const allText = JSON.stringify(spec).toLowerCase();
    expect(allText).toContain("without claude");
    // Restates the measured numbers — never fabricates new ones.
    expect(allText).toContain("4.1%");
    expect(allText).toContain("4.8%");
    // Includes the per-segment findings from FR-G2.
    expect(allText).toContain("social");
    expect(allText).toContain("search");
  });

  it("renders the fallback spec to a valid .pptx (no key needed)", async () => {
    const buffer = await renderDeck(buildFallbackDeckSpec(SUMMARY));
    expect(isValidPptx(buffer)).toBe(true);
  });

  it("never crashes and still yields a valid deck on an empty/garbage summary", async () => {
    const buffer = await renderDeck(buildFallbackDeckSpec({}));
    expect(isValidPptx(buffer)).toBe(true);
    const buffer2 = await renderDeck(buildFallbackDeckSpec("garbage"));
    expect(isValidPptx(buffer2)).toBe(true);
  });

  it("does not invent segment findings when none are supplied", () => {
    const spec = buildFallbackDeckSpec({ ...SUMMARY, segments: [] });
    const hasSegmentsSlide = spec.slides.some((s) => s.layout === "segments");
    expect(hasSegmentsSlide).toBe(false);
  });
});

describe("normalizeSummary — defensive, never fabricates numbers", () => {
  it("defaults missing fields without inventing metric values", () => {
    const s = normalizeSummary({});
    expect(s.verdict).toBe("inconclusive");
    expect(s.metricMovement.championValue).toBeNull();
    expect(s.metricMovement.challengerValue).toBeNull();
    expect(s.segments).toEqual([]);
  });

  it("accepts segmentFindings as an alias and bounds the list", () => {
    const s = normalizeSummary({
      segmentFindings: Array(20).fill({ segment: "X", winner: "Y" }),
    });
    expect(s.segments.length).toBeLessThanOrEqual(8);
    expect(s.segments[0].segmentLabel).toBe("X");
  });
});

describe("FR-E1 — token usage capture (same shape as the proposal route)", () => {
  it("normalises a Claude usage block to input/output/total tokens", () => {
    const usage = extractUsage({ input_tokens: 1200, output_tokens: 800 });
    expect(usage).toEqual({
      input_tokens: 1200,
      output_tokens: 800,
      total_tokens: 2000,
    });
  });

  it("treats a missing/garbage usage block as zero spend (no fabrication)", () => {
    expect(extractUsage(undefined)).toEqual({
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
    });
    expect(extractUsage({ junk: true })).toEqual({
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
    });
  });

  it("passes through cache token fields when present", () => {
    const usage = extractUsage({
      input_tokens: 10,
      output_tokens: 5,
      cache_read_input_tokens: 4,
    });
    expect(usage.cache_read_input_tokens).toBe(4);
    expect(usage.total_tokens).toBe(15);
  });
});
