// ===========================================================================
// "Can we find your page?" check core — pure, network-free (FR-A3)
// ===========================================================================
// Everything about the Claude-backed page sanity check that does NOT need the
// network: building the prompt from the located-page reference, validating /
// sanitising Claude's output into { found, suitable, reason }, the structured
// JSON schema, and a clear NON-fabricated "could not check" state for when the
// key is missing or the call fails (Section 6: never fabricate a "found").
//
// Split out of api/check-page.js so the prompt-build + verdict-sanitisation are
// unit-testable without a key or a live model call. Mirrors the api/_lib/
// proposal.js pure-core pattern. The handler adds ONLY the Anthropic SDK call.

// Structured-output schema (Claude output_config.format / json_schema). Claude
// must return exactly { found, suitable, reason }. We re-validate server-side
// regardless — schema adherence is necessary, not trusted.
export const CHECK_PAGE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    found: {
      type: "boolean",
      description: "Whether a concrete page suitable to locate a hero was identified.",
    },
    suitable: {
      type: "boolean",
      description:
        "Whether that page is suitable for hero-section optimization (a real landing/home page with a hero, not just a config or README).",
    },
    reason: {
      type: "string",
      description:
        "One short human-readable sentence explaining the verdict and, if not found/unsuitable, what the user should fix.",
    },
  },
  required: ["found", "suitable", "reason"],
};

// ---------------------------------------------------------------------------
// Prompt builder (FR-A3a)
// ---------------------------------------------------------------------------
// Takes the sanitized source reference (from api/_lib/source.js
// buildSourceReference) and returns { system, user }. The reference carries
// owner/repo/ref + the located page path + WHY it was picked — no secret.
export function buildCheckPagePrompt(reference) {
  const ref = reference && typeof reference === "object" ? reference : {};
  const repo = ref.repo && typeof ref.repo === "object" ? ref.repo : {};
  const page = ref.page && typeof ref.page === "object" ? ref.page : null;

  const system =
    "You are a senior web engineer helping an automated A/B testing tool confirm " +
    "it has found the right page before it spends effort optimizing it. You are " +
    "given a reference to a page located inside a connected website source. Decide " +
    "whether a concrete page was found and whether it is SUITABLE for hero-section " +
    "optimization (a real landing/home page that would have a hero — not merely a " +
    "config file, a README, or an empty repo). Be honest: if nothing usable was " +
    "located, say it was not found and tell the user what to connect instead. " +
    "Respond ONLY with the requested structured JSON.";

  const lines = [
    `Source kind: ${ref.label ?? ref.kind ?? "unknown"}.`,
    `Repository: ${repo.owner ?? "?"}/${repo.name ?? "?"} (ref: ${ref.ref ?? "HEAD"}).`,
  ];
  if (page) {
    lines.push(
      `Located candidate page: ${page.path}`,
      `Why it was picked: ${page.reason ?? "best match in the repository"}.`
    );
  } else {
    lines.push(
      "Located candidate page: NONE — no plausible hero/home/landing page was found in the repository."
    );
  }
  lines.push(
    "",
    "Decide:",
    "- found: was a concrete page identified?",
    "- suitable: is it a real landing/home page suitable for HERO-section optimization?",
    "- reason: one short sentence. If not found or unsuitable, say what the user should connect or fix."
  );

  return { system, user: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// Verdict validation / sanitisation (FR-A3a, FR-A3b)
// ---------------------------------------------------------------------------
// Takes whatever Claude returned (parsed object or raw string) and returns a
// safe verdict the handler can return directly:
//   { ok:true, found, suitable, reason, blocksProgress }
//   { ok:false, reason }   -> malformed; caller returns a "could not check" state
// NEVER fabricates a positive result: if the output isn't parseable as a clear
// verdict, ok is false and the UI shows "could not check" (Section 6).
export function sanitizeCheckVerdict(rawOutput) {
  const parsed = coerceObject(rawOutput);
  if (!parsed) {
    return { ok: false, reason: "model output was not a parseable verdict" };
  }
  if (typeof parsed.found !== "boolean") {
    return { ok: false, reason: "model output did not include a clear found/not-found verdict" };
  }
  const found = parsed.found;
  // `suitable` defaults to false when found is false; if found is true it must
  // be an explicit boolean — otherwise we cannot trust a positive result.
  let suitable;
  if (typeof parsed.suitable === "boolean") {
    suitable = parsed.suitable;
  } else if (!found) {
    suitable = false;
  } else {
    return { ok: false, reason: "model output did not include a clear suitability verdict" };
  }

  const reason = sanitizeReason(parsed.reason);
  if (!reason) {
    return { ok: false, reason: "model output did not include a usable reason" };
  }

  // FR-A3b: a not-found OR unsuitable verdict blocks progress to analytics.
  const blocksProgress = !found || !suitable;

  return { ok: true, found, suitable, reason, blocksProgress };
}

// The clear, non-fabricated state for "we could not run the check" — missing
// key, upstream error, timeout, or malformed output. Crucially found=false so
// progress is BLOCKED (a real "found" must come from a real verdict).
export function couldNotCheck(reason) {
  return {
    ok: true,
    checked: false,
    found: false,
    suitable: false,
    reason:
      typeof reason === "string" && reason.trim()
        ? reason.trim()
        : "Could not run the page check right now. Try again.",
    blocksProgress: true,
  };
}

// --- helpers ---------------------------------------------------------------

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

function sanitizeReason(value) {
  if (typeof value !== "string") return null;
  let s = value.replace(/<[^>]*>/g, " "); // drop any tags
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x1f\x7f]/g, " "); // control chars -> space
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.slice(0, 300);
}
