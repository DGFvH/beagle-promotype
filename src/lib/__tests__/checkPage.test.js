// Tests for the FR-A3 "can we find your page?" check core (api/_lib/checkPage.js)
// and the loadCurrentHero mapping (FR-A2 seam wired by FR-A1). No network/key:
//   - FR-A3a: prompt build includes the located page reference
//   - FR-A3b: a not-found/unsuitable verdict blocks progress; never fabricates
//   - FR-A3c: (logging shape covered by handler; here we prove the verdict the
//             handler logs is well-formed)
//   - loadCurrentHero maps a connected page onto HERO_DESIGN_SPACE, fallback clean

import { describe, it, expect } from "vitest";
import {
  buildCheckPagePrompt,
  sanitizeCheckVerdict,
  couldNotCheck,
  CHECK_PAGE_JSON_SCHEMA,
} from "../../../api/_lib/checkPage.js";
import { buildSourceReference } from "../../../api/_lib/source.js";
import {
  loadCurrentHero,
  isValidHeroConfig,
  defaultHeroConfig,
} from "../engine.js";

const REF = buildSourceReference({
  kind: "github",
  repo: { owner: "acme", repo: "site" },
  page: { path: "src/components/Hero.jsx", reason: "an explicit Hero component", score: 100 },
  defaultBranch: "main",
});

describe("FR-A3a — prompt includes the located page reference", () => {
  it("mentions the repo and located page path", () => {
    const { system, user } = buildCheckPagePrompt(REF);
    expect(typeof system).toBe("string");
    expect(user).toContain("acme/site");
    expect(user).toContain("src/components/Hero.jsx");
  });

  it("clearly states NONE when no page was located", () => {
    const noPage = buildSourceReference({
      kind: "github",
      repo: { owner: "acme", repo: "site" },
      page: null,
      defaultBranch: "main",
    });
    const { user } = buildCheckPagePrompt(noPage);
    expect(user).toMatch(/NONE/);
  });

  it("does not throw on a malformed reference", () => {
    expect(() => buildCheckPagePrompt(null)).not.toThrow();
    expect(() => buildCheckPagePrompt({})).not.toThrow();
  });
});

describe("FR-A3 schema", () => {
  it("requires found, suitable, reason", () => {
    expect(CHECK_PAGE_JSON_SCHEMA.required).toEqual(["found", "suitable", "reason"]);
  });
});

describe("FR-A3a — verdict sanitisation", () => {
  it("accepts a clean found+suitable verdict and does not block", () => {
    const r = sanitizeCheckVerdict({
      found: true,
      suitable: true,
      reason: "Found a real hero component.",
    });
    expect(r).toMatchObject({ ok: true, found: true, suitable: true, blocksProgress: false });
  });

  it("parses JSON embedded in prose (structured-output text block)", () => {
    const r = sanitizeCheckVerdict(
      'Here is the verdict: {"found": true, "suitable": false, "reason": "Only a README."}'
    );
    expect(r.ok).toBe(true);
    expect(r.suitable).toBe(false);
    expect(r.blocksProgress).toBe(true);
  });

  it("strips markup from the reason", () => {
    const r = sanitizeCheckVerdict({
      found: true,
      suitable: true,
      reason: "<b>Found</b> the page <script>x</script>",
    });
    expect(r.reason).not.toMatch(/<|>/);
  });
});

describe("FR-A3b — not-found / unsuitable blocks progress; never fabricates", () => {
  it("blocks when not found", () => {
    const r = sanitizeCheckVerdict({ found: false, suitable: false, reason: "No page found." });
    expect(r).toMatchObject({ ok: true, found: false, blocksProgress: true });
  });

  it("does NOT fabricate a found result from malformed output", () => {
    for (const bad of [null, "", "not json", "{}", { reason: "x" }, { found: "yes", suitable: true, reason: "x" }]) {
      const r = sanitizeCheckVerdict(bad);
      expect(r.ok).toBe(false); // caller turns this into could-not-check
    }
  });

  it("rejects a found:true with no suitability verdict (cannot trust positive)", () => {
    const r = sanitizeCheckVerdict({ found: true, reason: "maybe" });
    expect(r.ok).toBe(false);
  });
});

describe("FR-A3 / Section 6 — couldNotCheck is a clear, blocking, non-found state", () => {
  it("found=false and blocksProgress=true with a usable reason", () => {
    const v = couldNotCheck();
    expect(v).toMatchObject({ ok: true, checked: false, found: false, suitable: false, blocksProgress: true });
    expect(typeof v.reason).toBe("string");
    expect(v.reason.length).toBeGreaterThan(0);
  });

  it("carries a supplied reason", () => {
    expect(couldNotCheck("no key").reason).toBe("no key");
  });
});

describe("FR-A2 (wired by FR-A1) — loadCurrentHero maps a connected page", () => {
  it("returns a valid hero config from a connected source reference", () => {
    const { config, source, meta } = loadCurrentHero({ source: REF });
    expect(isValidHeroConfig(config)).toBe(true);
    expect(source).toBe(REF);
    expect(meta.label).toMatch(/acme\/site/);
    expect(meta.located).toBe(true);
  });

  it("falls back cleanly to the default hero when no source / no page", () => {
    const a = loadCurrentHero({});
    expect(a.config).toEqual(defaultHeroConfig());
    const noPage = buildSourceReference({
      kind: "github",
      repo: { owner: "acme", repo: "site" },
      page: null,
      defaultBranch: "main",
    });
    const b = loadCurrentHero({ source: noPage });
    expect(isValidHeroConfig(b.config)).toBe(true);
    expect(b.config).toEqual(defaultHeroConfig());
  });

  it("an explicit config still wins and is normalised", () => {
    const { config } = loadCurrentHero({ config: { layout: "center", bogus: "x" } });
    expect(isValidHeroConfig(config)).toBe(true);
    expect(config.layout).toBe("center");
  });
});
