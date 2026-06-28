// ---------------------------------------------------------------------------
// Serverless route: connect a website source for the target page (FR-A1)
// ---------------------------------------------------------------------------
// Runs on Vercel (Node serverless) and under the local Vite dev middleware
// (vite.config.js). The GitHub token the user supplies is used ONLY here,
// server-side, to call the GitHub API; it is NEVER returned to or embedded in
// the client (Section 6). The browser POSTs { kind, url, token }; this route
// validates the input (pure core in api/_lib/source.js), calls GitHub to prove
// the repo + token work, locates the candidate hero page, and returns a
// sanitized reference (NO token) the client stores.
//
// Failure modes, all returned as a clear state (never a crash):
//   - bad input         -> 400 { error, detail }
//   - stubbed source    -> 200 { comingSoon:true, ... }   (WordPress/Framer)
//   - bad/again token   -> 401/403 passthrough as { error:"auth_failed", ... }
//   - repo not found     -> 404 { error:"repo_not_found" }
//   - upstream/timeout   -> 502 { error:"upstream_error" | "timeout" }
//
// Mirrors the secret-handling shape of api/propose-challenger.js: method guard,
// JSON body hardening, AbortController timeout, truncated upstream-error detail.

import {
  validateConnectRequest,
  pickHeroPage,
  buildSourceReference,
} from "./_lib/source.js";

const TIMEOUT_MS = 12000;
const GITHUB_API = "https://api.github.com";

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

  const v = validateConnectRequest(body);

  // WordPress / Framer: stubbed for the MVP. Return a clear coming-soon state.
  if (v.comingSoon) {
    return res.status(200).json({
      comingSoon: true,
      kind: v.kind,
      reason: v.error,
    });
  }

  // Bad input (unknown source, missing/invalid token or URL). Clear 400.
  if (!v.ok) {
    return res.status(400).json({ error: "invalid_input", detail: v.error });
  }

  const { kind, repo } = v;
  const token = String(body.token).trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // 1) Prove the repo + token work (also yields the default branch).
    const repoResp = await fetch(
      `${GITHUB_API}/repos/${repo.owner}/${repo.repo}`,
      {
        headers: ghHeaders(token),
        signal: controller.signal,
      }
    );

    if (repoResp.status === 401 || repoResp.status === 403) {
      clearTimeout(timer);
      return res.status(repoResp.status).json({
        error: "auth_failed",
        detail:
          "GitHub rejected the token. Check that it is valid and has access to this repository.",
      });
    }
    if (repoResp.status === 404) {
      clearTimeout(timer);
      return res.status(404).json({
        error: "repo_not_found",
        detail:
          "Repository not found. Check the URL, or that the token can see this (possibly private) repo.",
      });
    }
    if (!repoResp.ok) {
      clearTimeout(timer);
      return res
        .status(502)
        .json({ error: "upstream_error", status: repoResp.status });
    }

    const repoData = await repoResp.json();
    const defaultBranch = repoData?.default_branch || "main";
    const treeRef = repo.ref || defaultBranch;

    // 2) List the repo file tree (recursive) and locate the candidate page.
    let page = null;
    try {
      const treeResp = await fetch(
        `${GITHUB_API}/repos/${repo.owner}/${repo.repo}/git/trees/${encodeURIComponent(
          treeRef
        )}?recursive=1`,
        { headers: ghHeaders(token), signal: controller.signal }
      );
      if (treeResp.ok) {
        const tree = await treeResp.json();
        const paths = Array.isArray(tree?.tree)
          ? tree.tree.filter((n) => n?.type === "blob").map((n) => n.path)
          : [];
        page = pickHeroPage(paths);
      }
      // A failed tree listing is non-fatal: the connection still succeeds with
      // no located page; FR-A3 then reports "not found" and blocks progress.
    } catch {
      // swallow — page stays null
    }

    clearTimeout(timer);

    // 3) Build the sanitized stored reference (NO token) — FR-A1d.
    const reference = buildSourceReference({ kind, repo, page, defaultBranch });

    return res.status(200).json({
      ok: true,
      source: reference,
      // Convenience flags for the UI; the reference is the source of truth.
      located: Boolean(page),
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted =
      err?.name === "AbortError" || /abort|timeout/i.test(err?.message ?? "");
    if (aborted) {
      return res.status(502).json({ error: "timeout" });
    }
    return res.status(502).json({
      error: "upstream_error",
      detail: String(err?.message ?? err).slice(0, 200),
    });
  }
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "beagle-mvp",
  };
}
