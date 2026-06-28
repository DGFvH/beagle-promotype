// Tests for the client orchestrator (src/lib/challenger.js): the graceful
// fallback-to-stub contract and the hypothesis threading (FR-C1b/FR-C1d).
// fetch is stubbed so no network or live key is needed.

import { describe, it, expect, afterEach, vi } from "vitest";
import { generateChallenger } from "../challenger.js";
import { defaultHeroConfig, makeVariant, isValidHeroConfig } from "../engine.js";

const winner = makeVariant({
  experimentId: "t",
  generation: 1,
  label: "Champion",
  config: defaultHeroConfig(),
  isControl: true,
});

function mockFetch(impl) {
  globalThis.fetch = vi.fn(impl);
}

afterEach(() => {
  vi.restoreAllMocks();
  delete globalThis.fetch;
});

describe("simulated mode", () => {
  it("returns a valid config + a clearly-simulated hypothesis (FR-C1b)", async () => {
    const out = await generateChallenger(winner, "ctr", [], "simulated");
    expect(out.source).toBe("simulated");
    expect(out.simulated).toBe(true);
    expect(isValidHeroConfig(out.config)).toBe(true);
    expect(typeof out.hypothesis).toBe("string");
    expect(out.hypothesis).toMatch(/simulated/i); // flagged, not passed as real Claude
  });
});

describe("ai mode — happy path", () => {
  it("threads Claude's variant + hypothesis through", async () => {
    const variant = { ...defaultHeroConfig(), ctaLabel: "Book a demo" };
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        variant,
        hypothesis: "Switching the CTA to 'Book a demo' should raise CTR.",
        diff: [{ attribute: "ctaLabel", from: "Get started", to: "Book a demo" }],
        usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
        source: "claude",
        model: "claude-opus-4-8",
      }),
    }));
    const out = await generateChallenger(winner, "ctr", [], "ai");
    expect(out.source).toBe("claude");
    expect(out.hypothesis).toMatch(/Book a demo/);
    expect(out.usage.total_tokens).toBe(120);
    expect(isValidHeroConfig(out.config)).toBe(true);
  });
});

describe("ai mode — graceful fallback (FR-C1d / never breaks the loop)", () => {
  it("falls back to the stub when the endpoint is not configured (501)", async () => {
    mockFetch(async () => ({ ok: false, status: 501, json: async () => ({ error: "not_configured" }) }));
    const out = await generateChallenger(winner, "ctr", [], "ai");
    expect(out.source).toBe("fallback");
    expect(out.simulated).toBe(true);
    expect(isValidHeroConfig(out.config)).toBe(true);
    expect(out.hypothesis.length).toBeGreaterThan(0);
    expect(out.fallbackReason).toMatch(/not configured/i);
  });

  it("falls back on a malformed/invalid model variant (422)", async () => {
    mockFetch(async () => ({
      ok: false,
      status: 422,
      json: async () => ({ error: "invalid_output", reason: "outside the hero design space" }),
    }));
    const out = await generateChallenger(winner, "ctr", [], "ai");
    expect(out.source).toBe("fallback");
    expect(isValidHeroConfig(out.config)).toBe(true);
  });

  it("falls back on a network/throw", async () => {
    mockFetch(async () => {
      throw new Error("network down");
    });
    const out = await generateChallenger(winner, "ctr", [], "ai");
    expect(out.source).toBe("fallback");
    expect(out.fallbackReason).toMatch(/request failed/i);
  });

  it("surfaces a guardrail block but still returns a usable challenger", async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        blocked: true,
        reason: "Blocked by 1 guardrail violation(s): headline is immutable.",
        violations: [{ rule: "immutable", attribute: "headline" }],
        usage: { input_tokens: 80, output_tokens: 10, total_tokens: 90 },
      }),
    }));
    const out = await generateChallenger(winner, "ctr", [], "ai");
    expect(out.blocked).toBe(true);
    expect(out.blockReason).toMatch(/immutable/i);
    expect(isValidHeroConfig(out.config)).toBe(true); // loop can still continue
    expect(out.usage.total_tokens).toBe(90);
  });
});

describe("ai mode — passes guardrails to the endpoint (FR-C2a)", () => {
  it("includes the guardrails payload in the POST body", async () => {
    let sentBody = null;
    mockFetch(async (_url, opts) => {
      sentBody = JSON.parse(opts.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          variant: { ...defaultHeroConfig(), ctaLabel: "Try Beagle" },
          hypothesis: "Trying a different CTA.",
          source: "claude",
          model: "claude-opus-4-8",
        }),
      };
    });
    const guardrails = { styleGuide: { doc: "Use sentence case." } };
    await generateChallenger(winner, "ctr", [], "ai", { guardrails });
    expect(sentBody.guardrails).toEqual(guardrails);
    expect(sentBody.goal).toBe("ctr");
    expect(sentBody.current).toBeTruthy();
  });
});
