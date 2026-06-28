// ===========================================================================
// Source-connection core — pure, importable, network-free (FR-A1)
// ===========================================================================
// Everything about connecting a website SOURCE (GitHub today; WordPress and
// Framer stubbed) that does NOT need the network: validating the credential /
// URL the chosen source needs, parsing a GitHub repo URL, picking the candidate
// hero page out of a repo file listing, and shaping the sanitized stored
// reference the client gets back.
//
// It is split out of api/connect-source.js so the validation + page-selection
// logic is unit-testable without a token or a live GitHub call (Section 6:
// "add an automated test for every `auto` criterion"). The handler adds ONLY
// the authenticated GitHub fetch around this core. The raw token is NEVER part
// of any value this module returns — only a sanitized reference.
//
// Mirrors the api/_lib/proposal.js pure-core pattern (buildProposalPrompt /
// sanitizeProposal). Do NOT import the Anthropic SDK or `fetch` here.

// Which sources the MVP knows about. GitHub is fully wired; the others are
// declared so the UI can present all three (FR-A1a) but are stubbed (FR-A1b).
export const SOURCE_KINDS = ["github", "wordpress", "framer"];
export const WIRED_SOURCES = ["github"];

export function isWiredSource(kind) {
  return WIRED_SOURCES.includes(kind);
}

// ---------------------------------------------------------------------------
// GitHub repo URL validation / parsing (FR-A1c)
// ---------------------------------------------------------------------------
// Accepts the common shapes a user pastes:
//   https://github.com/owner/repo
//   https://github.com/owner/repo.git
//   https://github.com/owner/repo/tree/main/...
//   git@github.com:owner/repo.git
//   owner/repo
// Returns { ok:true, owner, repo, ref? } or { ok:false, error } — NEVER throws.
export function parseGitHubRepoUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "Enter a GitHub repository URL." };
  }
  let s = raw.trim();

  // git@github.com:owner/repo(.git)
  const sshMatch = s.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?\/?$/i);
  if (sshMatch) {
    return finishRepo(sshMatch[1], sshMatch[2]);
  }

  // Strip a scheme if present.
  const hadScheme = /^https?:\/\//i.test(s);
  s = s.replace(/^https?:\/\//i, "");
  s = s.replace(/^www\./i, "");

  let rest;
  if (/^github\.com\//i.test(s)) {
    // Explicit github.com host -> take the path after it.
    rest = s.replace(/^github\.com\//i, "");
  } else if (hadScheme || s.includes(".")) {
    // A URL/host was given but it isn't github.com (e.g. gitlab.com/a/b), or a
    // bare "host.tld/..." -> reject. (A real owner can't contain a dot before
    // the first slash in github URLs we accept.)
    const firstSeg = s.split("/")[0] || "";
    if (firstSeg.includes(".")) {
      return { ok: false, error: "That doesn't look like a github.com repository URL." };
    }
    rest = s;
  } else {
    // Bare "owner/repo".
    rest = s;
  }

  const parts = rest.split("/").filter(Boolean);
  if (parts.length < 2) {
    return {
      ok: false,
      error: "Use the form https://github.com/owner/repo.",
    };
  }
  const owner = parts[0];
  let repo = parts[1].replace(/\.git$/i, "");

  // Optional branch/ref via .../tree/<ref>
  let gitRef;
  if (parts[2] === "tree" && parts[3]) {
    gitRef = parts[3];
  }

  return finishRepo(owner, repo, gitRef);
}

function finishRepo(owner, repo, gitRef) {
  const NAME = /^[A-Za-z0-9_.-]+$/;
  if (!owner || !NAME.test(owner)) {
    return { ok: false, error: "The repository owner is missing or invalid." };
  }
  if (!repo || !NAME.test(repo)) {
    return { ok: false, error: "The repository name is missing or invalid." };
  }
  const out = { ok: true, owner, repo };
  if (gitRef) out.ref = gitRef;
  return out;
}

// ---------------------------------------------------------------------------
// Credential validation (FR-A1c)
// ---------------------------------------------------------------------------
// A GitHub Personal Access Token is required to connect. We only sanity-check
// the SHAPE here (presence + plausible token form) — real validity is proven by
// the authenticated call in the handler, which fails safely. Returns
// { ok:true } or { ok:false, error }. Never throws, never echoes the token.
export function validateGitHubToken(token) {
  if (typeof token !== "string" || !token.trim()) {
    return { ok: false, error: "A GitHub access token is required." };
  }
  const t = token.trim();
  // Classic PATs (ghp_…), fine-grained (github_pat_…), and OAuth (gho_…) plus
  // legacy 40-hex tokens. Keep this permissive — the network call is the real
  // gate; we only catch obvious garbage (spaces, far-too-short).
  const looksLikeToken =
    /^gh[pousr]_[A-Za-z0-9]{20,}$/.test(t) ||
    /^github_pat_[A-Za-z0-9_]{20,}$/.test(t) ||
    /^[a-f0-9]{40}$/i.test(t);
  if (!looksLikeToken) {
    return {
      ok: false,
      error:
        "That doesn't look like a GitHub token. Paste a Personal Access Token (starts with ghp_ or github_pat_).",
    };
  }
  return { ok: true };
}

// Validate the whole connect request for a chosen source BEFORE any network
// call. Returns { ok:true, kind, repo } for GitHub, a clear coming-soon block
// for stubbed sources, or { ok:false, error } for bad input. Never throws.
export function validateConnectRequest(body) {
  const b = body && typeof body === "object" ? body : {};
  const kind = String(b.kind ?? "").toLowerCase();

  if (!SOURCE_KINDS.includes(kind)) {
    return { ok: false, error: "Choose a source: GitHub, WordPress, or Framer." };
  }

  if (!isWiredSource(kind)) {
    // WordPress / Framer: stubbed for the MVP (FR-A1b). Not an error — a clear
    // "coming soon" state the handler returns as 200 so the UI can show it.
    return {
      ok: false,
      comingSoon: true,
      kind,
      error: `${labelFor(kind)} connection is coming soon. GitHub is fully supported for the MVP.`,
    };
  }

  const tokenCheck = validateGitHubToken(b.token);
  if (!tokenCheck.ok) return { ok: false, kind, error: tokenCheck.error };

  const repo = parseGitHubRepoUrl(b.url ?? b.repoUrl);
  if (!repo.ok) return { ok: false, kind, error: repo.error };

  return { ok: true, kind, repo };
}

export function labelFor(kind) {
  return { github: "GitHub", wordpress: "WordPress", framer: "Framer" }[kind] ?? kind;
}

// ---------------------------------------------------------------------------
// Candidate hero-page selection (FR-A1d / feeds FR-A3)
// ---------------------------------------------------------------------------
// Given a flat list of repo paths (from the GitHub trees API), pick the single
// most-likely page that contains the site hero. Pure ranking — no network.
// Returns { path, score, reason } or null when nothing plausible is found.
//
// Heuristic priority (highest first):
//   src/components/Hero.*, **/Hero.*           — an explicit hero component
//   src/pages/index.*, pages/index.*, app/page.* — the homepage / landing route
//   index.html / public/index.html             — a static homepage
//   src/App.* / App.*                          — the app shell (often holds the hero)
//   README.md                                  — last resort (something to check)
const PAGE_RULES = [
  { re: /(^|\/)hero\.(jsx?|tsx?|vue|svelte|astro)$/i, score: 100, reason: "an explicit Hero component" },
  { re: /(^|\/)(index|page)\.(jsx?|tsx?|vue|svelte|astro)$/i, score: 80, reason: "the homepage / landing route" },
  { re: /(^|\/)index\.html?$/i, score: 70, reason: "a static homepage" },
  { re: /(^|\/)app\.(jsx?|tsx?|vue|svelte|astro)$/i, score: 60, reason: "the app shell that renders the hero" },
  { re: /(^|\/)(home|landing)\.(jsx?|tsx?|vue|svelte|astro|html?)$/i, score: 55, reason: "a landing/home page" },
  { re: /(^|\/)readme\.md$/i, score: 10, reason: "the repository README (fallback)" },
];

export function pickHeroPage(paths) {
  if (!Array.isArray(paths)) return null;
  let best = null;
  for (const raw of paths) {
    if (typeof raw !== "string" || !raw) continue;
    const path = raw.replace(/^\.?\//, "");
    for (const rule of PAGE_RULES) {
      if (rule.re.test(path)) {
        // Prefer shallower paths when two files tie on score.
        const depthPenalty = (path.match(/\//g) || []).length;
        const effective = rule.score - depthPenalty;
        if (!best || effective > best._effective) {
          best = { path, score: rule.score, reason: rule.reason, _effective: effective };
        }
        break; // first (highest) rule wins for this path
      }
    }
  }
  if (!best) return null;
  // Strip the internal sort key.
  return { path: best.path, score: best.score, reason: best.reason };
}

// ---------------------------------------------------------------------------
// Sanitized stored reference (FR-A1d)
// ---------------------------------------------------------------------------
// Build the reference the client stores + later steps consume. It carries
// ENOUGH to locate the page again (owner/repo/ref/path) and to drive the FR-A3
// Claude check — but NEVER the token. Plain JSON, safe to serialise/log.
export function buildSourceReference({ kind, repo, page, defaultBranch }) {
  return {
    kind,
    label: labelFor(kind),
    repo: { owner: repo.owner, name: repo.repo },
    ref: repo.ref || defaultBranch || "HEAD",
    page: page
      ? { path: page.path, reason: page.reason, score: page.score }
      : null,
    // A stable human handle for logs / UI. No secret.
    locator: `${kind}:${repo.owner}/${repo.repo}${page ? `:${page.path}` : ""}`,
    connectedAt: Date.now(),
  };
}
