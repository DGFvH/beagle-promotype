// ---------------------------------------------------------------------------
// Serverless proxy: Claude hero-variant proposal (FR-C1 / FR-C2 / FR-E1)
// ---------------------------------------------------------------------------
// Runs on Vercel (Node serverless) and under the local Vite dev middleware
// (see vite.config.js). The Anthropic API key lives ONLY here, server-side, and
// is NEVER shipped to the browser (Section 6). The client (src/lib/challenger.js)
// POSTs the chosen metric + current hero + history + the supplied design system /
// guardrails; this route calls Claude, validates/sanitises the output, runs the
// guardrail gate, and returns { variant, hypothesis, diff, usage, source, model }.
//
// Failure modes, all of which the client treats as "fall back to the local stub":
//   - no key            -> 501 not_configured
//   - upstream error    -> 502 upstream_error
//   - timeout           -> 502 timeout
//   - malformed output  -> 422 invalid_output  (never returns raw markup)
// A guardrail-blocked variant is returned 200 with { blocked: true, reason } so
// the UI can surface it (guardrails win — Section 0.3 — never silently dropped).
//
// Claude usage (per the claude-api skill): official @anthropic-ai/sdk, model
// claude-opus-4-8, structured JSON via output_config.format, NO temperature /
// budget_tokens / assistant prefill. response.usage is read for FR-E1.

import Anthropic from "@anthropic-ai/sdk";
import {
  buildProposalPrompt,
  sanitizeProposal,
  extractUsage,
  PROPOSAL_JSON_SCHEMA,
} from "./_lib/proposal.js";

const DEFAULT_MODEL = "claude-opus-4-8";
const TIMEOUT_MS = 20000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key -> AI mode unavailable. Client falls back to the local stub.
    return res.status(501).json({ error: "not_configured" });
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body && typeof body === "object" ? body : {};

  // A probe request (probeAiAvailable) just needs the 501/200 distinction; we've
  // already returned 501 above when there's no key, so short-circuit here so a
  // probe never spends a model call.
  if (body.probe === true) {
    return res.status(200).json({ ok: true, configured: true, model });
  }

  const current = body.current ?? body.winner ?? null;
  const goal = body.goal ?? "ctr";
  const history = Array.isArray(body.history) ? body.history : [];
  const guardrails = body.guardrails ?? null;

  const { system, user } = buildProposalPrompt({ current, goal, history, guardrails });

  let response;
  try {
    const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
    response = await client.messages.create({
      model,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: user }],
      output_config: {
        format: {
          type: "json_schema",
          schema: PROPOSAL_JSON_SCHEMA,
        },
      },
    });
  } catch (err) {
    const status = err?.status;
    const aborted =
      err?.name === "APIConnectionTimeoutError" ||
      err?.name === "AbortError" ||
      /timeout/i.test(err?.message ?? "");
    if (aborted) {
      return res.status(502).json({ error: "timeout" });
    }
    return res
      .status(502)
      .json({ error: "upstream_error", status: status ?? null });
  }

  // Token usage for FR-E1 — captured regardless of whether the content validates.
  const usage = extractUsage(response?.usage);

  // Pull the model's text/JSON payload out of the content blocks. Structured
  // output lands as a text block whose content is the JSON; be defensive.
  const rawText = extractText(response);

  const result = sanitizeProposal(rawText, { current, goal, guardrails });

  if (result.ok) {
    return res.status(200).json({
      variant: result.variant,
      hypothesis: result.hypothesis,
      diff: result.diff,
      warnings: result.warnings,
      usage,
      source: "claude",
      model,
    });
  }

  if (result.blocked) {
    // Guardrails win — surface the block, do NOT return an approved variant.
    return res.status(200).json({
      blocked: true,
      reason: result.reason,
      violations: result.violations,
      // Still expose the (sanitised) variant + diff so the UI can show WHAT was
      // blocked, but never as something approvable.
      variant: result.variant,
      hypothesis: result.hypothesis,
      diff: result.diff,
      usage,
      source: "claude",
      model,
    });
  }

  // Malformed / out-of-space output: never inject unvalidated markup. Tell the
  // client to fall back to the local stub.
  return res
    .status(422)
    .json({ error: "invalid_output", reason: result.reason, usage, model });
}

// Concatenate all text content blocks. The SDK's structured-output response
// returns the JSON inside a text block; `parsed_output` may also be present.
function extractText(response) {
  if (!response) return "";
  if (response.parsed_output && typeof response.parsed_output === "object") {
    return response.parsed_output;
  }
  const content = Array.isArray(response.content) ? response.content : [];
  const text = content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
  return text;
}
