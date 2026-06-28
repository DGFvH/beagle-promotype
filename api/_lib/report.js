// ===========================================================================
// Report core — pure, importable, network-free (FR-G3 / FR-E1)
// ===========================================================================
// Everything about a Claude-backed PowerPoint report that does NOT need the
// network: building the prompt (run summary + supplied style guide), validating
// /sanitising the model's deck spec, building a DETERMINISTIC fallback spec
// straight from the run summary, and rendering a validated spec to a real
// .pptx buffer via pptxgenjs.
//
// Split out of api/generate-report.js so the prompt-build, validation, fallback
// and rendering are unit-testable without an API key or a live model call
// (Section 6: "add an automated test for every `auto` criterion"). The handler
// adds ONLY the Anthropic SDK call around this core.
//
// Claude usage (per the claude-api skill): official @anthropic-ai/sdk, model
// claude-opus-4-8, structured JSON via output_config.format, NO temperature /
// budget_tokens / assistant prefill. response.usage is read for FR-E1.

import pptxgen from "pptxgenjs";

// ---------------------------------------------------------------------------
// Deck-spec safe schema (Claude `output_config.format` / json_schema)
// ---------------------------------------------------------------------------
// Constrains Claude to an ordered list of slides plus a small `style` block
// derived from the style guide. Even with structured output we re-validate and
// clamp server-side (FR-G3b safety) — schema adherence is necessary, not
// trusted. The renderer only ever consumes a sanitised spec.
const SLIDE_LAYOUTS = ["title", "bullets", "metric", "segments", "closing"];

export const DECK_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "Deck title (the report headline)." },
    subtitle: { type: "string", description: "Short deck subtitle / context line." },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        primaryColor: { type: "string", description: "Hex color e.g. #1A1A1A." },
        accentColor: { type: "string", description: "Hex accent color e.g. #C2410C." },
        backgroundColor: { type: "string", description: "Hex slide background e.g. #F4F1EA." },
        fontFamily: { type: "string", description: "A common presentation font, e.g. Georgia." },
        tone: { type: "string", description: "One word for the voice, e.g. confident." },
      },
      required: ["primaryColor", "accentColor", "backgroundColor", "fontFamily", "tone"],
    },
    slides: {
      type: "array",
      description: "Ordered slides for the deck.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          layout: { type: "string", enum: SLIDE_LAYOUTS.slice() },
          title: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          notes: { type: "string", description: "Speaker notes for this slide." },
          metricCallout: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              value: { type: "string" },
              delta: { type: "string" },
            },
            required: ["label", "value"],
          },
          segments: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                segment: { type: "string" },
                winner: { type: "string" },
                note: { type: "string" },
              },
              required: ["segment", "winner"],
            },
          },
        },
        required: ["layout", "title"],
      },
    },
  },
  required: ["title", "slides", "style"],
};

// ---------------------------------------------------------------------------
// Prompt builder (FR-G3b)
// ---------------------------------------------------------------------------
// Returns { system, user, styleGuide }. The user prompt MUST include: the run
// summary (hypothesis, confirm/reject decision + numbers, key metric movement,
// and the FR-G2 segment/heterogeneity findings) PLUS the supplied style guide.
// Tests assert these reach the prompt.
export function buildReportPrompt(summary = {}) {
  const s = normalizeSummary(summary);

  const verdictLine = `Decision: ${s.verdict.toUpperCase()}${
    s.verdictReason ? ` — ${s.verdictReason}` : ""
  }.`;

  const metricLines = [
    `Key metric: ${s.metric.label}.`,
    s.metricMovement.championValue != null
      ? `  - Champion (${s.metricMovement.championLabel}): ${s.metricMovement.championDisplay}`
      : "  - Champion: no data",
    s.metricMovement.challengerValue != null
      ? `  - Challenger (${s.metricMovement.challengerLabel}): ${s.metricMovement.challengerDisplay}`
      : "  - Challenger: no data",
    s.metricMovement.deltaDisplay
      ? `  - Movement: ${s.metricMovement.deltaDisplay}`
      : "  - Movement: not available",
    `  - Confidence: ${s.confidence.pct}% (${s.confidence.label}).`,
  ].join("\n");

  const segmentLines = s.segments.length
    ? s.segments
        .map(
          (seg) =>
            `  - ${seg.segmentLabel}: winner ${seg.winnerLabel}${
              seg.divergesFromAggregate ? " (DIVERGES from the overall winner)" : ""
            }${seg.note ? ` — ${seg.note}` : ""}`
        )
        .join("\n")
    : "  - No per-segment breakdown available.";

  const system =
    "You are a senior growth analyst preparing a concise, executive-ready " +
    "PowerPoint deck that reports the result of one A/B test on a website hero " +
    "section. You are given a factual run summary and a brand style guide. " +
    "Build a short deck (4-6 slides) that presents ONLY the facts in the summary " +
    "— never invent metric numbers, segments, or outcomes. Derive the deck's " +
    "colors, font, and tone from the supplied style guide so the deck visibly " +
    "follows the brand. Respond ONLY with the requested structured JSON.";

  const userParts = [
    `REPORT TITLE HINT: ${s.title}`,
    "",
    "RUN SUMMARY (the only facts you may present):",
    `Hypothesis: ${s.hypothesis}`,
    verdictLine,
    "",
    metricLines,
    "",
    "PER-SEGMENT / HETEROGENEITY FINDINGS (FR-G2):",
    segmentLines,
  ];

  if (s.styleGuide) {
    userParts.push(
      "",
      "BRAND STYLE GUIDE (derive colors, font, and tone from this — the deck must visibly follow it):",
      s.styleGuide
    );
  } else {
    userParts.push(
      "",
      "BRAND STYLE GUIDE: none supplied. Keep the deck clean, neutral, and professional."
    );
  }

  userParts.push(
    "",
    "Produce an ordered deck: a title slide, a hypothesis + decision slide, a key-metric",
    "slide (use metricCallout), a per-segment findings slide if segments exist, and a",
    "closing/recommendation slide. Give every slide speaker notes. Pick style colors and",
    "font that reflect the style guide above."
  );

  return { system, user: userParts.join("\n"), styleGuide: s.styleGuide };
}

// ---------------------------------------------------------------------------
// Deck-spec validation / sanitisation (FR-G3b safety)
// ---------------------------------------------------------------------------
// Takes whatever the model returned (already-parsed object, or a raw string),
// clamps it to a safe shape, and returns a render-ready spec — or null when it
// is unusable (caller then falls back to the deterministic deck). NEVER lets
// unvalidated content through: every string is sanitised to plain text, layouts
// are whitelisted, colors are validated hex, arrays are bounded.
export function sanitizeDeckSpec(rawOutput) {
  const parsed = coerceObject(rawOutput);
  if (!parsed) return null;

  const title = safeText(parsed.title, 120);
  if (!title) return null;

  const rawSlides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const slides = rawSlides
    .slice(0, 12)
    .map(sanitizeSlide)
    .filter(Boolean);
  if (slides.length === 0) return null;

  return {
    title,
    subtitle: safeText(parsed.subtitle, 160) || "",
    style: sanitizeStyle(parsed.style),
    slides,
  };
}

function sanitizeSlide(raw) {
  if (!raw || typeof raw !== "object") return null;
  const layout = SLIDE_LAYOUTS.includes(raw.layout) ? raw.layout : "bullets";
  const title = safeText(raw.title, 120);
  if (!title) return null;

  const slide = { layout, title };

  const bullets = Array.isArray(raw.bullets)
    ? raw.bullets
        .slice(0, 8)
        .map((b) => safeText(b, 240))
        .filter(Boolean)
    : [];
  if (bullets.length) slide.bullets = bullets;

  const notes = safeText(raw.notes, 800);
  if (notes) slide.notes = notes;

  if (raw.metricCallout && typeof raw.metricCallout === "object") {
    const label = safeText(raw.metricCallout.label, 80);
    const value = safeText(raw.metricCallout.value, 60);
    if (label && value) {
      slide.metricCallout = { label, value };
      const delta = safeText(raw.metricCallout.delta, 60);
      if (delta) slide.metricCallout.delta = delta;
    }
  }

  if (Array.isArray(raw.segments)) {
    const segments = raw.segments
      .slice(0, 8)
      .map((seg) => {
        if (!seg || typeof seg !== "object") return null;
        const segment = safeText(seg.segment, 80);
        const winner = safeText(seg.winner, 80);
        if (!segment || !winner) return null;
        const out = { segment, winner };
        const note = safeText(seg.note, 160);
        if (note) out.note = note;
        return out;
      })
      .filter(Boolean);
    if (segments.length) slide.segments = segments;
  }

  return slide;
}

const DEFAULT_STYLE = {
  primaryColor: "1A1A1A",
  accentColor: "2563EB",
  backgroundColor: "FFFFFF",
  fontFamily: "Arial",
  tone: "professional",
};

// Allowed presentation fonts — anything else falls back to a safe default so we
// never emit a font name that could break the OOXML or carry odd content.
const SAFE_FONTS = [
  "Arial",
  "Helvetica",
  "Calibri",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Garamond",
  "Cambria",
  "Playfair Display",
  "Fraunces",
];

function sanitizeStyle(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const font = safeText(r.fontFamily, 40);
  const matchedFont =
    SAFE_FONTS.find((f) => f.toLowerCase() === (font || "").toLowerCase()) ||
    DEFAULT_STYLE.fontFamily;
  return {
    primaryColor: safeHex(r.primaryColor) || DEFAULT_STYLE.primaryColor,
    accentColor: safeHex(r.accentColor) || DEFAULT_STYLE.accentColor,
    backgroundColor: safeHex(r.backgroundColor) || DEFAULT_STYLE.backgroundColor,
    fontFamily: matchedFont,
    tone: safeText(r.tone, 24) || DEFAULT_STYLE.tone,
  };
}

// ---------------------------------------------------------------------------
// Deterministic fallback spec (Section 6 — no key / model failure)
// ---------------------------------------------------------------------------
// Builds a valid deck spec straight from the run summary, with NO Claude styling
// and a clear "generated without Claude" label. Never fabricates numbers — it
// only restates what the summary already contains.
export function buildFallbackDeckSpec(summary = {}) {
  const s = normalizeSummary(summary);

  const slides = [];

  // Title slide.
  slides.push({
    layout: "title",
    title: s.title,
    bullets: [
      "Generated without Claude (deterministic fallback)",
      s.metric.label,
    ],
    notes:
      "This report was generated deterministically from the run summary without a Claude call. " +
      "The numbers are taken directly from the measured results.",
  });

  // Hypothesis + decision.
  slides.push({
    layout: "bullets",
    title: "Hypothesis & decision",
    bullets: [
      `Hypothesis: ${s.hypothesis}`,
      `Decision: ${capitalize(s.verdict)}`,
      ...(s.verdictReason ? [s.verdictReason] : []),
    ],
    notes: `The test ${s.verdict === "confirmed" ? "confirmed" : s.verdict === "rejected" ? "rejected" : "was inconclusive on"} the hypothesis.`,
  });

  // Key metric movement.
  const metricSlide = {
    layout: "metric",
    title: `Key metric: ${s.metric.label}`,
    bullets: [
      s.metricMovement.championValue != null
        ? `${s.metricMovement.championLabel}: ${s.metricMovement.championDisplay}`
        : `${s.metricMovement.championLabel}: no data`,
      s.metricMovement.challengerValue != null
        ? `${s.metricMovement.challengerLabel}: ${s.metricMovement.challengerDisplay}`
        : `${s.metricMovement.challengerLabel}: no data`,
      `Confidence: ${s.confidence.pct}% (${s.confidence.label})`,
    ],
    notes: "Per-variant metric values and the movement between them, from the measured data.",
  };
  if (s.metricMovement.deltaDisplay) {
    metricSlide.metricCallout = {
      label: `${s.metric.label} movement`,
      value: s.metricMovement.challengerDisplay ?? "--",
      delta: s.metricMovement.deltaDisplay,
    };
  }
  slides.push(metricSlide);

  // Per-segment findings (only when present — never fabricated).
  if (s.segments.length) {
    slides.push({
      layout: "segments",
      title: "Per-segment findings",
      notes:
        "Heterogeneity analysis across segments (simulated until real analytics land). " +
        "A diverging segment recommends its own winner.",
      segments: s.segments.map((seg) => ({
        segment: seg.segmentLabel,
        winner: seg.winnerLabel,
        note: seg.divergesFromAggregate ? "Diverges from overall winner" : "Matches overall winner",
      })),
    });
  }

  // Closing / recommendation.
  slides.push({
    layout: "closing",
    title: "Recommendation",
    bullets: [
      s.verdict === "confirmed"
        ? `Roll out the challenger for ${s.metric.label}.`
        : s.verdict === "rejected"
          ? "Keep the champion; iterate on a new hypothesis."
          : "Gather more data before deciding.",
      ...(s.segments.some((seg) => seg.divergesFromAggregate)
        ? ["Consider per-segment serving where effects diverge."]
        : []),
    ],
    notes: "Closing recommendation derived from the decision and segment findings.",
  });

  return {
    title: s.title,
    subtitle: s.metric.label,
    style: { ...DEFAULT_STYLE },
    slides,
  };
}

// ---------------------------------------------------------------------------
// Renderer (FR-G3c) — sanitised spec -> real .pptx buffer
// ---------------------------------------------------------------------------
// pptxgenjs runs server-side. Returns a Node Buffer of a valid OOXML .pptx.
// The spec MUST already be sanitised (sanitizeDeckSpec / buildFallbackDeckSpec).
export async function renderDeck(spec) {
  const safe = isRenderableSpec(spec) ? spec : buildFallbackDeckSpec({});
  const style = safe.style ?? DEFAULT_STYLE;
  const font = style.fontFamily;
  const primary = stripHash(style.primaryColor);
  const accent = stripHash(style.accentColor);
  const bg = stripHash(style.backgroundColor);

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.author = "Beagle";
  pptx.company = "Beagle";
  pptx.title = safe.title;

  for (const slide of safe.slides) {
    const s = pptx.addSlide();
    s.background = { color: bg };

    // Accent rule under the title for brand presence.
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 1.15,
      w: 2.2,
      h: 0.06,
      fill: { color: accent },
      line: { type: "none" },
    });

    s.addText(safe.title === slide.title ? slide.title : slide.title, {
      x: 0.5,
      y: 0.4,
      w: 12.3,
      h: 0.8,
      fontSize: slide.layout === "title" ? 36 : 26,
      bold: true,
      color: primary,
      fontFace: font,
      align: "left",
    });

    let y = 1.5;

    if (slide.layout === "title" && safe.subtitle) {
      s.addText(safe.subtitle, {
        x: 0.5,
        y,
        w: 12.3,
        h: 0.6,
        fontSize: 18,
        color: accent,
        fontFace: font,
      });
      y += 0.8;
    }

    if (slide.metricCallout) {
      const c = slide.metricCallout;
      s.addText(
        [
          { text: `${c.value}`, options: { fontSize: 44, bold: true, color: accent, breakLine: true } },
          { text: c.label, options: { fontSize: 16, color: primary, breakLine: true } },
          ...(c.delta ? [{ text: c.delta, options: { fontSize: 18, color: primary } }] : []),
        ],
        { x: 0.5, y, w: 6, h: 2, fontFace: font, align: "left", valign: "top" }
      );
      y += 2.2;
    }

    if (Array.isArray(slide.bullets) && slide.bullets.length) {
      s.addText(
        slide.bullets.map((t) => ({ text: t, options: { bullet: true, breakLine: true } })),
        {
          x: 0.5,
          y,
          w: 12.3,
          h: 4.5,
          fontSize: 16,
          color: primary,
          fontFace: font,
          valign: "top",
          lineSpacingMultiple: 1.2,
        }
      );
    }

    if (Array.isArray(slide.segments) && slide.segments.length) {
      const rows = [
        [
          headerCell("Segment", accent, font),
          headerCell("Winner", accent, font),
          headerCell("Note", accent, font),
        ],
        ...slide.segments.map((seg) => [
          bodyCell(seg.segment, primary, font),
          bodyCell(seg.winner, primary, font),
          bodyCell(seg.note ?? "", primary, font),
        ]),
      ];
      s.addTable(rows, {
        x: 0.5,
        y,
        w: 12.3,
        colW: [3.5, 3.5, 5.3],
        border: { type: "solid", color: "DDDDDD", pt: 1 },
        valign: "middle",
      });
    }

    if (slide.notes) {
      s.addNotes(slide.notes);
    }
  }

  // "nodebuffer" gives a real Buffer of the .pptx (a zip / OOXML package).
  return pptx.write({ outputType: "nodebuffer" });
}

function headerCell(text, color, font) {
  return {
    text,
    options: { bold: true, color: "FFFFFF", fill: { color }, fontFace: font, fontSize: 13 },
  };
}
function bodyCell(text, color, font) {
  return { text, options: { color, fontFace: font, fontSize: 12 } };
}

// ---------------------------------------------------------------------------
// Run-summary normalisation
// ---------------------------------------------------------------------------
// Accepts the loose summary the Dashboard sends (built from the FR-G1 verdict +
// FR-G2 segmentAnalysis) and produces a stable internal shape both the prompt
// builder and the fallback/renderer consume. Defensive — never throws, never
// fabricates a number that isn't present.
export function normalizeSummary(summary = {}) {
  const sm = summary && typeof summary === "object" ? summary : {};
  const metricLabel = safeText(sm.metric?.label ?? sm.metricLabel, 80) || "Key metric";

  const verdictRaw = String(sm.verdict ?? "inconclusive").toLowerCase();
  const verdict = ["confirmed", "rejected", "inconclusive"].includes(verdictRaw)
    ? verdictRaw
    : "inconclusive";

  const mm = sm.metricMovement ?? {};
  const championValue = numOrNull(mm.championValue ?? sm.championValue);
  const challengerValue = numOrNull(mm.challengerValue ?? sm.challengerValue);

  const metricMovement = {
    championLabel: safeText(mm.championLabel ?? sm.championLabel, 60) || "Champion",
    challengerLabel: safeText(mm.challengerLabel ?? sm.challengerLabel, 60) || "Challenger",
    championValue,
    challengerValue,
    championDisplay: safeText(mm.championDisplay, 40) || (championValue != null ? String(championValue) : "--"),
    challengerDisplay: safeText(mm.challengerDisplay, 40) || (challengerValue != null ? String(challengerValue) : "--"),
    deltaDisplay: safeText(mm.deltaDisplay, 60) || "",
  };

  const segArr = Array.isArray(sm.segments)
    ? sm.segments
    : Array.isArray(sm.segmentFindings)
      ? sm.segmentFindings
      : [];
  const segments = segArr
    .map((seg) => {
      if (!seg || typeof seg !== "object") return null;
      const segmentLabel =
        safeText(seg.segmentLabel ?? seg.segment, 80) || null;
      const winnerLabel = safeText(seg.winnerLabel ?? seg.winner, 80) || null;
      if (!segmentLabel || !winnerLabel) return null;
      return {
        segmentLabel,
        winnerLabel,
        divergesFromAggregate: !!seg.divergesFromAggregate,
        note: safeText(seg.note, 160) || "",
      };
    })
    .filter(Boolean)
    .slice(0, 8);

  const confPct =
    sm.confidence && typeof sm.confidence === "object"
      ? Math.max(0, Math.min(100, Math.round(num(sm.confidence.pct))))
      : 0;
  const confLabel =
    safeText(sm.confidence?.label, 80) || "rough indicator (not a production p-value)";

  return {
    title: safeText(sm.title, 120) || `Hero A/B test report — ${metricLabel}`,
    hypothesis: safeText(sm.hypothesis, 600) || "No hypothesis was recorded for this test.",
    verdict,
    verdictReason: safeText(sm.verdictReason ?? sm.reason, 400) || "",
    metric: { label: metricLabel },
    metricMovement,
    segments,
    confidence: { pct: confPct, label: confLabel },
    styleGuide: typeof sm.styleGuide === "string" ? sm.styleGuide.trim() : "",
  };
}

// ---------------------------------------------------------------------------
// Token usage (FR-E1) — mirror the proposal route's shape
// ---------------------------------------------------------------------------
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

function isRenderableSpec(spec) {
  return (
    spec &&
    typeof spec === "object" &&
    typeof spec.title === "string" &&
    Array.isArray(spec.slides) &&
    spec.slides.length > 0
  );
}

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

// Coerce any model/summary value to a safe single-line-ish plain string: drops
// angle-bracket markup, neutralises control chars, collapses whitespace, bounds
// length. Nothing that could render as markup is ever returned (FR-G3b safety).
function safeText(value, max = 240) {
  if (typeof value === "number" && Number.isFinite(value)) value = String(value);
  if (typeof value !== "string") return "";
  let str = value.replace(/<[^>]*>/g, " "); // drop tags
  // eslint-disable-next-line no-control-regex
  str = str.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, " "); // control chars
  str = str.replace(/[ \t\r\n]+/g, " ").trim();
  return str.slice(0, max);
}

// Validate a hex color (#RGB / #RRGGBB) and return the 6-digit uppercase digits
// (no '#') for pptxgenjs, or "" if invalid.
function safeHex(value) {
  if (typeof value !== "string") return "";
  const m = value.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return "";
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return h.toUpperCase();
}

function stripHash(v) {
  return String(v ?? "").replace(/^#/, "");
}
function capitalize(s) {
  const str = String(s ?? "");
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function num(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}
function numOrNull(n) {
  if (n === undefined || n === null || n === "") return null;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}
function numOrUndef(n) {
  if (n === undefined || n === null) return undefined;
  const v = Number(n);
  return Number.isFinite(v) ? v : undefined;
}
