import { describe, it, expect } from "vitest";
import {
  HERO_DESIGN_SPACE,
  HERO_ATTRIBUTES,
  HERO_OPTIONS,
  defaultHeroConfig,
  loadCurrentHero,
  normalizeConfig,
  isValidHeroConfig,
  configKey,
  describeMutation,
} from "../engine.js";

// FR-A2 (auto): the design space represents hero-level attributes, each
// enum-constrained to a small set of safe options (Section 8 — no open-ended UI).
describe("FR-A2 hero design space", () => {
  it("exposes hero-level attributes, not nav-menu attributes", () => {
    expect(HERO_ATTRIBUTES).toEqual(
      expect.arrayContaining([
        "headline",
        "subheadline",
        "ctaLabel",
        "ctaStyle",
        "layout",
        "media",
      ])
    );
    // The old nav design space must be gone.
    expect(HERO_ATTRIBUTES).not.toContain("navStyle");
    expect(HERO_ATTRIBUTES).not.toContain("align");
  });

  it("constrains every attribute to a small, non-empty option set", () => {
    for (const key of HERO_ATTRIBUTES) {
      const spec = HERO_DESIGN_SPACE[key];
      expect(Array.isArray(spec.options)).toBe(true);
      expect(spec.options.length).toBeGreaterThan(0);
      expect(spec.options.length).toBeLessThanOrEqual(8); // constrained, not open-ended
      // The declared default must itself be a valid option.
      expect(spec.options).toContain(spec.default);
    }
  });

  it("HERO_OPTIONS mirrors the design-space options for downstream validation", () => {
    for (const key of HERO_ATTRIBUTES) {
      expect(HERO_OPTIONS[key]).toEqual(HERO_DESIGN_SPACE[key].options);
    }
  });

  it("normalizeConfig clamps any out-of-space value back to the default", () => {
    const dirty = {
      headline: "totally arbitrary injected string",
      layout: "diagonal",
      media: "hologram",
      ctaStyle: "neon",
      // missing ctaLabel / subheadline entirely
    };
    const n = normalizeConfig(dirty);
    expect(n.headline).toBe(HERO_DESIGN_SPACE.headline.default);
    expect(n.layout).toBe(HERO_DESIGN_SPACE.layout.default);
    expect(n.media).toBe(HERO_DESIGN_SPACE.media.default);
    expect(n.ctaStyle).toBe(HERO_DESIGN_SPACE.ctaStyle.default);
    expect(isValidHeroConfig(n)).toBe(true);
  });

  it("isValidHeroConfig rejects configs with any out-of-space attribute", () => {
    const good = defaultHeroConfig();
    expect(isValidHeroConfig(good)).toBe(true);
    expect(isValidHeroConfig({ ...good, layout: "diagonal" })).toBe(false);
    expect(isValidHeroConfig({ ...good, headline: "<script>alert(1)</script>" })).toBe(false);
    expect(isValidHeroConfig(null)).toBe(false);
  });
});

// FR-A2 (manual criterion has an auto-checkable seam): a champion baseline hero
// can be produced/loaded via the loadCurrentHero() extension point.
describe("FR-A2 champion baseline hero", () => {
  it("defaultHeroConfig produces a fully-populated, valid hero", () => {
    const cfg = defaultHeroConfig();
    expect(Object.keys(cfg).sort()).toEqual([...HERO_ATTRIBUTES].sort());
    expect(isValidHeroConfig(cfg)).toBe(true);
  });

  it("loadCurrentHero returns a normalized fixture config and a source seam", () => {
    const loaded = loadCurrentHero();
    expect(isValidHeroConfig(loaded.config)).toBe(true);
    expect(loaded.source).toBe("fixture"); // real connector (FR-A1) overrides this
    expect(loaded.meta).toBeTruthy();
  });

  it("loadCurrentHero normalizes a supplied (possibly partial) config", () => {
    const loaded = loadCurrentHero({ config: { layout: "bogus", media: "video" } });
    expect(loaded.config.layout).toBe(HERO_DESIGN_SPACE.layout.default);
    expect(loaded.config.media).toBe("video");
    expect(isValidHeroConfig(loaded.config)).toBe(true);
  });
});

describe("FR-A2 config identity & diff helpers operate over hero attributes", () => {
  it("configKey is stable and distinguishes by hero attributes", () => {
    const a = defaultHeroConfig();
    const b = { ...a, layout: "center" };
    expect(configKey(a)).toBe(configKey({ ...a }));
    expect(configKey(a)).not.toBe(configKey(b));
    expect(configKey(a)).toContain("layout=");
  });

  it("describeMutation reports the changed hero attribute", () => {
    const a = defaultHeroConfig();
    const b = { ...a, ctaLabel: "Book a demo" };
    expect(describeMutation(a, b)).toContain("ctaLabel -> Book a demo");
    expect(describeMutation(null, a)).toBe("Initial control");
  });
});
