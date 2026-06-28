// Tests for the source-connection core (api/_lib/source.js) and the per-project
// source store (src/lib/sources/store.js). Cover the `auto` acceptance criteria
// for FR-A1 without any network or token:
//   - FR-A1c: credential/URL validation -> clear error, never throws
//   - FR-A1d: on success a source + located-page reference is stored (no secret)
//   - candidate hero-page selection ranking

import { describe, it, expect, beforeEach } from "vitest";
import {
  parseGitHubRepoUrl,
  validateGitHubToken,
  validateConnectRequest,
  pickHeroPage,
  buildSourceReference,
  SOURCE_KINDS,
  isWiredSource,
} from "../../../api/_lib/source.js";
import {
  setConnectedSource,
  getConnectedSource,
  setPageCheck,
  getPageCheck,
  canProceedToAnalytics,
  clearSource,
} from "../sources/store.js";

const PID = "sources-test";

beforeEach(() => clearSource(undefined));

describe("FR-A1c — GitHub repo URL validation", () => {
  it("parses a standard https github URL", () => {
    const r = parseGitHubRepoUrl("https://github.com/acme/site");
    expect(r).toMatchObject({ ok: true, owner: "acme", repo: "site" });
  });

  it("strips a trailing .git and a /tree/<branch> suffix", () => {
    expect(parseGitHubRepoUrl("https://github.com/acme/site.git")).toMatchObject({
      ok: true,
      owner: "acme",
      repo: "site",
    });
    expect(
      parseGitHubRepoUrl("https://github.com/acme/site/tree/develop")
    ).toMatchObject({ ok: true, owner: "acme", repo: "site", ref: "develop" });
  });

  it("accepts the bare owner/repo and the ssh form", () => {
    expect(parseGitHubRepoUrl("acme/site")).toMatchObject({ ok: true, owner: "acme", repo: "site" });
    expect(parseGitHubRepoUrl("git@github.com:acme/site.git")).toMatchObject({
      ok: true,
      owner: "acme",
      repo: "site",
    });
  });

  it("returns a clear error (never throws) for bad input", () => {
    for (const bad of ["", "   ", null, undefined, 42, "not a url", "https://gitlab.com/a/b"]) {
      const r = parseGitHubRepoUrl(bad);
      expect(r.ok).toBe(false);
      expect(typeof r.error).toBe("string");
      expect(r.error.length).toBeGreaterThan(0);
    }
  });
});

describe("FR-A1c — token validation", () => {
  it("accepts plausible PAT shapes", () => {
    expect(validateGitHubToken("ghp_" + "a".repeat(36)).ok).toBe(true);
    expect(validateGitHubToken("github_pat_" + "A1".repeat(20)).ok).toBe(true);
    expect(validateGitHubToken("a".repeat(40)).ok).toBe(true); // legacy 40-hex
  });

  it("rejects missing / obviously bad tokens with a clear error", () => {
    for (const bad of ["", "   ", null, undefined, "short", "has spaces here"]) {
      const r = validateGitHubToken(bad);
      expect(r.ok).toBe(false);
      expect(typeof r.error).toBe("string");
    }
  });
});

describe("FR-A1a/b/c — validateConnectRequest dispatch", () => {
  it("knows all three sources; only github is wired", () => {
    expect(SOURCE_KINDS).toEqual(["github", "wordpress", "framer"]);
    expect(isWiredSource("github")).toBe(true);
    expect(isWiredSource("wordpress")).toBe(false);
    expect(isWiredSource("framer")).toBe(false);
  });

  it("returns a coming-soon block for stubbed sources (not an error)", () => {
    const r = validateConnectRequest({ kind: "wordpress" });
    expect(r.ok).toBe(false);
    expect(r.comingSoon).toBe(true);
    expect(r.error).toMatch(/coming soon/i);
  });

  it("rejects an unknown source clearly", () => {
    const r = validateConnectRequest({ kind: "bitbucket" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/GitHub|WordPress|Framer/);
  });

  it("validates github url + token together and never throws", () => {
    expect(validateConnectRequest({ kind: "github", url: "acme/site" }).ok).toBe(false); // missing token
    expect(
      validateConnectRequest({ kind: "github", url: "bad", token: "ghp_" + "a".repeat(36) }).ok
    ).toBe(false); // bad url
    const good = validateConnectRequest({
      kind: "github",
      url: "https://github.com/acme/site",
      token: "ghp_" + "a".repeat(36),
    });
    expect(good).toMatchObject({ ok: true, kind: "github" });
    expect(good.repo).toMatchObject({ owner: "acme", repo: "site" });
  });

  it("does not throw on garbage body", () => {
    expect(() => validateConnectRequest(null)).not.toThrow();
    expect(() => validateConnectRequest("nope")).not.toThrow();
    expect(validateConnectRequest(undefined).ok).toBe(false);
  });
});

describe("hero-page selection ranking", () => {
  it("prefers an explicit Hero component over the homepage route", () => {
    const page = pickHeroPage([
      "README.md",
      "src/pages/index.tsx",
      "src/components/Hero.jsx",
      "vite.config.js",
    ]);
    expect(page.path).toBe("src/components/Hero.jsx");
    expect(page.reason).toMatch(/hero/i);
  });

  it("falls to the homepage route, then static index.html, then README", () => {
    expect(pickHeroPage(["pages/index.tsx", "README.md"]).path).toBe("pages/index.tsx");
    expect(pickHeroPage(["public/index.html", "README.md"]).path).toBe("public/index.html");
    expect(pickHeroPage(["README.md", "LICENSE"]).path).toBe("README.md");
  });

  it("returns null when nothing plausible is found", () => {
    expect(pickHeroPage(["LICENSE", "package.json", "tsconfig.json"])).toBeNull();
    expect(pickHeroPage(null)).toBeNull();
    expect(pickHeroPage([])).toBeNull();
  });
});

describe("FR-A1d — sanitized reference contains no secret", () => {
  it("buildSourceReference carries repo + page + locator, never a token", () => {
    const ref = buildSourceReference({
      kind: "github",
      repo: { owner: "acme", repo: "site" },
      page: { path: "src/components/Hero.jsx", reason: "an explicit Hero component", score: 100 },
      defaultBranch: "main",
    });
    expect(ref).toMatchObject({
      kind: "github",
      repo: { owner: "acme", name: "site" },
      ref: "main",
      page: { path: "src/components/Hero.jsx" },
    });
    expect(ref.locator).toBe("github:acme/site:src/components/Hero.jsx");
    // No token field anywhere in the serialised reference.
    expect(JSON.stringify(ref)).not.toMatch(/ghp_|github_pat_|token/i);
  });
});

describe("FR-A1d — store keeps the reference (no secret) for later steps", () => {
  it("stores and reloads the connected source reference", () => {
    const ref = buildSourceReference({
      kind: "github",
      repo: { owner: "acme", repo: "site" },
      page: { path: "src/App.jsx", reason: "the app shell", score: 60 },
      defaultBranch: "main",
    });
    expect(getConnectedSource(PID)).toBeNull();
    setConnectedSource(ref, PID);
    expect(getConnectedSource(PID)).toEqual(ref);
  });
});

describe("FR-A3b — gate: progress only with a found+suitable verdict", () => {
  it("blocks until a source is connected AND the check passed", () => {
    expect(canProceedToAnalytics(PID)).toBe(false); // nothing connected

    setConnectedSource({ kind: "github", page: { path: "src/components/Hero.jsx" } }, PID);
    expect(canProceedToAnalytics(PID)).toBe(false); // connected, no check yet

    setPageCheck({ found: false, suitable: false, reason: "not found" }, PID);
    expect(canProceedToAnalytics(PID)).toBe(false); // not found -> blocked

    setPageCheck({ found: true, suitable: false, reason: "unsuitable" }, PID);
    expect(canProceedToAnalytics(PID)).toBe(false); // unsuitable -> blocked

    setPageCheck({ found: true, suitable: true, reason: "looks good" }, PID);
    expect(canProceedToAnalytics(PID)).toBe(true); // found + suitable -> allowed
  });

  it("getPageCheck round-trips the stored verdict", () => {
    const v = { found: true, suitable: true, reason: "ok" };
    setPageCheck(v, PID);
    expect(getPageCheck(PID)).toEqual(v);
  });
});
