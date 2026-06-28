// ---------------------------------------------------------------------------
// Serverless route: Claude "Can we find your page?" check (FR-A3)
// ---------------------------------------------------------------------------
// Runs on Vercel (Node serverless) and under the local Vite dev middleware.
// The Anthropic API key lives ONLY here, server-side (Section 6). The client
// POSTs the sanitized source reference (from /api/connect-source — NO token);
// this route asks Claude whether the located page can be found and is suitable
// for hero optimization, validates the output, LOGS the result (page ref +
// verdict + reason — FR-A3c), and returns { found, suitable, reason }.
//
// Crucially it NEVER fabricates a "found" result: missing key, upstream error,
// timeout, or malformed output all return a clear non-fabricated "could not
// check" state with found=false, which BLOCKS progress (FR-A3b / Section 6).
//
// Claude usage (per the claude-api skill): official @anthropic-ai/sdk, model
// claude-opus-4-8, structured JSON via output_config.format, adaptive thinking,
// NO temperature / budget_tokens / prefill. response.usage is emitted for FR-E1.

import Anthropic from "@anthropic-ai/sdk";
import {
  buildCheckPagePrompt,
  sanitizeCheckVerdict,
  couldNotCheck,
  CHECK_PAGE_JSON_SCHEMA,
} from "./_lib/checkPage.js";
import { extractUsage } from "./_lib/proposal.js";

const DEFAULT_MODEL = "claude-opus-4-8";
const TIMEOUT_MS = 20000;

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

  // The sanitized source reference produced by /api/connect-source.
  const reference = body.source ?? body.reference ?? null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key -> we genuinely cannot run the Claude check. Return a clear,
    // non-fabricated "could not check" state (found=false -> blocks progress).
    const verdict = couldNotCheck(
      "Page check unavailable: the Claude API key is not configured on the server."
    );
    logCheck(reference, verdict, { reason: "not_configured" });
    return res.status(200).json({ ...verdict, error: "not_configured" });
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const { system, user } = buildCheckPagePrompt(reference);

  let response;
  try {
    const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
    response = await client.messages.create({
      model,
      max_tokens: 500,
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: user }],
      output_config: {
        format: {
          type: "json_schema",
          schema: CHECK_PAGE_JSON_SCHEMA,
        },
      },
    });
  } catch (err) {
    const aborted =
      err?.name === "APIConnectionTimeoutError" ||
      err?.name === "AbortError" ||
      /timeout/i.test(err?.message ?? "");
    const verdict = couldNotCheck(
      aborted
        ? "The page check timed out. Try again."
        : "The page check could not reach Claude. Try again."
    );
    logCheck(reference, verdict, {
      reason: aborted ? "timeout" : "upstream_error",
      status: err?.status ?? null,
    });
    return res
      .status(200)
      .json({ ...verdict, error: aborted ? "timeout" : "upstream_error" });
  }

  const usage = extractUsage(response?.usage);
  const rawText = extractText(response);
  const result = sanitizeCheckVerdict(rawText);

  if (!result.ok) {
    // Malformed output: never fabricate a "found". Clear could-not-check state.
    const verdict = couldNotCheck(
      "The page check returned an unclear result. Try again."
    );
    logCheck(reference, verdict, { reason: "invalid_output", detail: result.reason });
    return res
      .status(200)
      .json({ ...verdict, usage, model, error: "invalid_output" });
  }

  const verdict = {
    ok: true,
    checked: true,
    found: result.found,
    suitable: result.suitable,
    reason: result.reason,
    blocksProgress: result.blocksProgress,
  };
  // FR-A3c: log the check (page reference + verdict + reason) for debugging.
  logCheck(reference, verdict, { usage });

  return res.status(200).json({ ...verdict, usage, source: "claude", model });
}

// FR-A3c — structured server-side log of every check: page ref + verdict +
// reason. Stays on the server (console) — never shipped to the client.
function logCheck(reference, verdict, extra = {}) {
  try {
    const locator =
      reference && typeof reference === "object"
        ? reference.locator ?? reference.page?.path ?? null
        : null;
    // eslint-disable-next-line no-console
    console.log(
      "[FR-A3 check-page]",
      JSON.stringify({
        page: locator,
        ref:
          reference && typeof reference === "object"
            ? { repo: reference.repo, ref: reference.ref, page: reference.page?.path }
            : null,
        verdict: {
          checked: verdict.checked ?? false,
          found: verdict.found,
          suitable: verdict.suitable,
          blocksProgress: verdict.blocksProgress,
        },
        reason: verdict.reason,
        ...extra,
      })
    );
  } catch {
    // logging must never break the response
  }
}

function extractText(response) {
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
