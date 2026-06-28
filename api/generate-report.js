// ---------------------------------------------------------------------------
// Serverless route: Claude-backed PowerPoint report (FR-G3 / FR-E1)
// ---------------------------------------------------------------------------
// Runs on Vercel (Node serverless) and under the local Vite dev middleware
// (see vite.config.js). The Anthropic API key lives ONLY here, server-side, and
// is NEVER shipped to the browser (Section 6). The client (a Dashboard trigger)
// POSTs the run summary; this route asks Claude for a deck SPEC (JSON), validates
// /sanitises it, renders it to a real .pptx via pptxgenjs, and returns the file
// base64-encoded so the browser can download it.
//
// Fallback (Section 6): with no key (501-style) or any Claude/spec failure, the
// route renders a DETERMINISTIC deck straight from the run summary — clearly
// labelled "generated without Claude", still a valid .pptx, never a crash and
// never fabricated results.
//
// Response contract (200):
//   { ok, source: "claude"|"fallback", model, filename, mimeType,
//     pptxBase64, usage, deck: { title, slideCount }, reason? }
//
// Claude usage (per the claude-api skill): official @anthropic-ai/sdk, model
// claude-opus-4-8, structured JSON via output_config.format, NO temperature /
// budget_tokens / assistant prefill. response.usage is read for FR-E1.

import Anthropic from "@anthropic-ai/sdk";
import {
  buildReportPrompt,
  sanitizeDeckSpec,
  buildFallbackDeckSpec,
  renderDeck,
  extractUsage,
  DECK_JSON_SCHEMA,
} from "./_lib/report.js";

const DEFAULT_MODEL = "claude-opus-4-8";
const TIMEOUT_MS = 30000;
const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const ZERO_USAGE = { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body && typeof body === "object" ? body : {};

  const summary = body.summary && typeof body.summary === "object" ? body.summary : body;
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Try Claude for the styled deck spec. Any failure (no key, upstream error,
  // timeout, malformed/invalid spec) falls through to the deterministic deck —
  // the route ALWAYS returns a valid .pptx (Section 6, never crash).
  let spec = null;
  let usage = ZERO_USAGE;
  let source = "fallback";
  let reason = null;

  if (apiKey) {
    const { system, user } = buildReportPrompt(summary);
    try {
      const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
      const response = await client.messages.create({
        model,
        max_tokens: 4000,
        thinking: { type: "adaptive" },
        system,
        messages: [{ role: "user", content: user }],
        output_config: {
          format: { type: "json_schema", schema: DECK_JSON_SCHEMA },
        },
      });
      // FR-E1: capture usage regardless of whether the spec validates.
      usage = extractUsage(response?.usage);
      const candidate = sanitizeDeckSpec(extractContent(response));
      if (candidate) {
        spec = candidate;
        source = "claude";
      } else {
        reason = "claude_output_invalid";
      }
    } catch (err) {
      reason = isTimeout(err) ? "claude_timeout" : "claude_upstream_error";
    }
  } else {
    reason = "not_configured";
  }

  if (!spec) {
    spec = buildFallbackDeckSpec(summary);
    source = "fallback";
  }

  // Render the validated/fallback spec to a real .pptx. Even this is guarded so a
  // renderer hiccup degrades to an empty-but-valid deck rather than a 500.
  let buffer;
  try {
    buffer = await renderDeck(spec);
  } catch (err) {
    try {
      buffer = await renderDeck(buildFallbackDeckSpec(summary));
      source = "fallback";
      reason = reason || "render_error";
    } catch (err2) {
      return res
        .status(500)
        .json({ error: "render_failed", detail: String(err2?.message ?? err2) });
    }
  }

  const pptxBase64 = Buffer.from(buffer).toString("base64");
  const filename = makeFilename(spec.title);

  return res.status(200).json({
    ok: true,
    source,
    model: source === "claude" ? model : null,
    reason,
    filename,
    mimeType: PPTX_MIME,
    pptxBase64,
    usage,
    deck: { title: spec.title, slideCount: spec.slides.length },
  });
}

// Pull the model's JSON payload from the structured-output response. Prefer the
// parsed object the SDK exposes; otherwise concatenate text blocks.
function extractContent(response) {
  if (!response) return "";
  if (response.parsed_output && typeof response.parsed_output === "object") {
    return response.parsed_output;
  }
  const content = Array.isArray(response.content) ? response.content : [];
  return content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
}

function isTimeout(err) {
  return (
    err?.name === "APIConnectionTimeoutError" ||
    err?.name === "AbortError" ||
    /timeout/i.test(err?.message ?? "")
  );
}

function makeFilename(title) {
  const base = String(title ?? "beagle-report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "beagle-report";
  return `${base}.pptx`;
}
