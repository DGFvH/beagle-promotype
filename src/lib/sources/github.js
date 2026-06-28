// ---------------------------------------------------------------------------
// GitHub source provider (fully wired) — client orchestration (FR-A1)
// ---------------------------------------------------------------------------
// Implements the common source interface ({ connect, locatePage }) for GitHub.
// The browser NEVER holds the token after this call: connect() POSTs the repo
// URL + token to /api/connect-source, which uses the token server-side and
// returns a sanitized reference (no secret). This module only forwards input
// and normalises the response into a clear result the UI can render.
//
// Mirrors the orchestrator pattern in src/lib/challenger.js (generateChallenger):
// every failure becomes a clear { ok:false, error } — it never throws.

export const kind = "github";
export const label = "GitHub";
export const wired = true;

// Validate input shape in the browser for instant feedback (the server is the
// enforcement of record and re-validates). Returns { ok, error }.
export function validateInput({ url, token }) {
  if (typeof url !== "string" || !url.trim()) {
    return { ok: false, error: "Enter your GitHub repository URL." };
  }
  if (typeof token !== "string" || !token.trim()) {
    return { ok: false, error: "Paste a GitHub access token." };
  }
  return { ok: true };
}

// Connect a GitHub source. Returns:
//   { ok:true, source }                 -> sanitized reference (NO token)
//   { ok:false, error, code? }          -> clear error state (retry path in UI)
// `source.page` is the located candidate page (null if none found — FR-A3 then
// reports not-found).
export async function connect({ url, token }) {
  const pre = validateInput({ url, token });
  if (!pre.ok) return pre;

  let resp;
  try {
    resp = await fetch("/api/connect-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, url, token }),
    });
  } catch {
    return {
      ok: false,
      error: "Could not reach the server to connect. Check your connection and try again.",
      code: "network",
    };
  }

  let data = null;
  try {
    data = await resp.json();
  } catch {
    data = null;
  }

  if (resp.ok && data?.ok && data.source) {
    return { ok: true, source: data.source, located: Boolean(data.located) };
  }

  // Map the server's clear failure states to user-facing messages + retry.
  const detail = data?.detail || data?.error;
  switch (data?.error) {
    case "auth_failed":
      return { ok: false, code: "auth_failed", error: detail || "GitHub rejected the token." };
    case "repo_not_found":
      return { ok: false, code: "repo_not_found", error: detail || "Repository not found." };
    case "invalid_input":
      return { ok: false, code: "invalid_input", error: detail || "Check the URL and token." };
    case "timeout":
      return { ok: false, code: "timeout", error: "GitHub took too long to respond. Try again." };
    case "upstream_error":
    default:
      return {
        ok: false,
        code: "upstream_error",
        error: detail || "Could not connect to GitHub right now. Try again.",
      };
  }
}

// locatePage is part of the common interface; for GitHub the page is located
// server-side during connect() (the token is needed and must stay server-side).
// Expose the located page off an already-connected reference.
export function locatePage(source) {
  return source?.page ?? null;
}
