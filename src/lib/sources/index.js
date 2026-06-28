// ---------------------------------------------------------------------------
// Source dispatcher + connect/check orchestration (FR-A1 / FR-A3)
// ---------------------------------------------------------------------------
// The single entry point the UI uses to: enumerate the three source options
// (FR-A1a), dispatch connect() to the chosen provider (GitHub wired;
// WordPress/Framer stubbed — FR-A1b), store the sanitized reference on success
// (FR-A1d), and run the Claude "can we find your page?" check (FR-A3) whose
// not-found/unsuitable verdict blocks progress to analytics (FR-A3b).
//
// Providers share a common shape ({ kind, label, wired, connect, locatePage })
// so the stubbed ones are drop-in later. This module never throws — every path
// returns a clear result object.

import * as github from "./github.js";
import * as wordpress from "./wordpress.js";
import * as framer from "./framer.js";
import {
  setConnectedSource,
  setPageCheck,
  getConnectedSource,
  getPageCheck,
  canProceedToAnalytics,
  DEFAULT_PROJECT,
} from "./store.js";

const PROVIDERS = { github, wordpress, framer };

// FR-A1a: the three options the UI presents. `wired` drives the "coming soon".
export const SOURCE_OPTIONS = [
  { kind: github.kind, label: github.label, wired: github.wired },
  { kind: wordpress.kind, label: wordpress.label, wired: wordpress.wired },
  { kind: framer.kind, label: framer.label, wired: framer.wired },
];

export function getProvider(kind) {
  return PROVIDERS[kind] ?? null;
}

// Connect the chosen source. On success, stores the sanitized reference
// (FR-A1d) and returns { ok:true, source }. Stubbed providers return
// { ok:false, comingSoon:true, ... }; failures return { ok:false, error }.
export async function connectSource(kind, input, projectId = DEFAULT_PROJECT) {
  const provider = getProvider(kind);
  if (!provider) {
    return { ok: false, error: "Choose a source: GitHub, WordPress, or Framer." };
  }
  const result = await provider.connect(input ?? {});
  if (result.ok && result.source) {
    setConnectedSource(result.source, projectId);
  }
  return result;
}

// FR-A3: run the Claude-backed "can we find your page?" check against the
// connected reference. Stores the verdict and returns it. The verdict's
// blocksProgress / found / suitable fields gate progress (FR-A3b). Never throws;
// a failed call yields a clear non-fabricated "could not check" verdict.
export async function checkConnectedPage(projectId = DEFAULT_PROJECT) {
  const source = getConnectedSource(projectId);
  if (!source) {
    const verdict = {
      ok: true,
      checked: false,
      found: false,
      suitable: false,
      reason: "Connect a source before running the page check.",
      blocksProgress: true,
    };
    setPageCheck(verdict, projectId);
    return verdict;
  }

  let resp;
  try {
    resp = await fetch("/api/check-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
  } catch {
    const verdict = {
      ok: true,
      checked: false,
      found: false,
      suitable: false,
      reason: "Could not reach the server to run the page check. Try again.",
      blocksProgress: true,
    };
    setPageCheck(verdict, projectId);
    return verdict;
  }

  let data = null;
  try {
    data = await resp.json();
  } catch {
    data = null;
  }

  // The server always returns a clear verdict object (even on error / no key).
  // Defensive: if we somehow got nothing usable, block progress.
  const verdict =
    data && typeof data.found === "boolean"
      ? {
          ok: true,
          checked: Boolean(data.checked),
          found: data.found,
          suitable: Boolean(data.suitable),
          reason:
            typeof data.reason === "string" && data.reason.trim()
              ? data.reason.trim()
              : "Page check returned no reason.",
          blocksProgress:
            typeof data.blocksProgress === "boolean"
              ? data.blocksProgress
              : !(data.found && data.suitable),
        }
      : {
          ok: true,
          checked: false,
          found: false,
          suitable: false,
          reason: "The page check returned an unexpected result. Try again.",
          blocksProgress: true,
        };

  setPageCheck(verdict, projectId);
  return verdict;
}

export {
  getConnectedSource,
  getPageCheck,
  canProceedToAnalytics,
  setConnectedSource,
  setPageCheck,
};
