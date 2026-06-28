// ---------------------------------------------------------------------------
// Source store (per-project) — stores a REFERENCE, never the secret (FR-A1d)
// ---------------------------------------------------------------------------
// On success, the app must store a reference to the connected source + the
// located page so later steps (FR-A3 check, FR-B analytics, FR-A2 loadCurrentHero)
// can use it. This module owns that storage. It holds ONLY the sanitized
// reference the server returns (owner/repo/ref/page/locator) — the GitHub token
// never reaches the browser, so it is never stored here.
//
// MVP has no backend; the reference lives in an in-memory project store keyed by
// projectId, plus the page-check verdict (FR-A3) once run. A real persistence
// layer slots in behind get/set without changing callers. Mirrors the shape of
// src/lib/guardrails/store.js.

const DEFAULT_PROJECT = "__default__";
const _projects = new Map(); // projectId -> { source, check }

// Store the connected source reference for a project. `reference` is the
// sanitized object from /api/connect-source (NO secret). Returns it back.
export function setConnectedSource(reference, projectId = DEFAULT_PROJECT) {
  const prev = _projects.get(projectId) ?? {};
  const next = { ...prev, source: reference ?? null };
  _projects.set(projectId, next);
  return reference ?? null;
}

// Load the connected source reference (or null if none connected yet).
export function getConnectedSource(projectId = DEFAULT_PROJECT) {
  return _projects.get(projectId)?.source ?? null;
}

// Store the FR-A3 page-check verdict against the project (so the gate can read
// whether progress is allowed without re-running the check).
export function setPageCheck(verdict, projectId = DEFAULT_PROJECT) {
  const prev = _projects.get(projectId) ?? {};
  const next = { ...prev, check: verdict ?? null };
  _projects.set(projectId, next);
  return verdict ?? null;
}

export function getPageCheck(projectId = DEFAULT_PROJECT) {
  return _projects.get(projectId)?.check ?? null;
}

// FR-A3b gate: may the user progress to the analytics step? Progress is allowed
// ONLY when a source is connected AND a real check ran that found a suitable
// page. Anything else (no source, no check, not-found, unsuitable, could-not-
// check) blocks — never fabricate a pass.
export function canProceedToAnalytics(projectId = DEFAULT_PROJECT) {
  const entry = _projects.get(projectId) ?? {};
  if (!entry.source) return false;
  const c = entry.check;
  return Boolean(c && c.found === true && c.suitable === true);
}

// Clear stored source + check (project reset / tests).
export function clearSource(projectId = DEFAULT_PROJECT) {
  if (projectId === undefined) _projects.clear();
  else _projects.delete(projectId);
}

export { DEFAULT_PROJECT };
