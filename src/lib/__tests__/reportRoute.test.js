// Tests for the serverless report route (api/generate-report.js).
// The Claude SDK is mocked — no network, no live key. Asserts:
//   - on a valid Claude spec: 200 with source "claude", a valid .pptx, and
//     captured token usage (FR-G3b/c + FR-E1)
//   - the prompt Claude receives carries the run summary + style guide (FR-G3b)
//   - on malformed Claude output: graceful fallback to a valid .pptx (Section 6)
//   - with no key: deterministic fallback .pptx, no crash, zero usage (Section 6)
//   - the API key is read server-side only (never echoed to the client)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Mock the Anthropic SDK -------------------------------------------------
// Capture the create() args so we can assert what reached the prompt, and let
// each test control what the model "returns".
const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class FakeAnthropic {
      constructor(opts) {
        FakeAnthropic.lastOpts = opts;
        this.messages = { create: createMock };
      }
    },
  };
});

import handler from "../../../api/generate-report.js";

// Minimal Vercel-style res shim.
function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    },
  };
}

const SUMMARY = {
  title: "Hero A/B test report — CTR",
  hypothesis: "An action-first CTA will lift click-through rate.",
  verdict: "confirmed",
  verdictReason: "Challenger leads on CTR (4.8% vs 4.1%) at 92% confidence.",
  metric: { label: "Click-through rate (CTR)" },
  metricMovement: {
    championLabel: "Champion",
    challengerLabel: "Challenger",
    championValue: 0.041,
    challengerValue: 0.048,
    championDisplay: "4.1%",
    challengerDisplay: "4.8%",
    deltaDisplay: "+17.1% vs champion",
  },
  segments: [{ segmentLabel: "Social", winnerLabel: "Challenger", divergesFromAggregate: false }],
  confidence: { pct: 92, label: "rough indicator (not a production p-value)" },
  styleGuide: "## Voice & tone\n- Confident, plain, evidence-led. No hype.",
};

function isValidPptxBase64(b64) {
  expect(typeof b64).toBe("string");
  const bytes = Buffer.from(b64, "base64");
  const pk = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const str = bytes.toString("latin1");
  return pk && str.includes("[Content_Types].xml") && str.includes("ppt/presentation.xml");
}

const GOOD_SPEC = {
  title: "Hero A/B test report",
  subtitle: "CTR result",
  style: {
    primaryColor: "#1A1A1A",
    accentColor: "#C2410C",
    backgroundColor: "#F4F1EA",
    fontFamily: "Georgia",
    tone: "confident",
  },
  slides: [
    { layout: "title", title: "Hero A/B test report", notes: "Intro" },
    {
      layout: "metric",
      title: "CTR moved up",
      metricCallout: { label: "CTR", value: "4.8%", delta: "+17%" },
    },
    { layout: "closing", title: "Recommendation", bullets: ["Roll out the challenger"] },
  ],
};

function claudeReturning(jsonObj, usage = { input_tokens: 1500, output_tokens: 900 }) {
  return {
    content: [{ type: "text", text: JSON.stringify(jsonObj) }],
    usage,
  };
}

const OLD_ENV = { ...process.env };

beforeEach(() => {
  createMock.mockReset();
});
afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe("FR-G3b/c + FR-E1 — Claude path returns a valid .pptx with usage", () => {
  it("calls Claude, returns source 'claude', a valid pptx, and captured usage", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    createMock.mockResolvedValue(
      claudeReturning(GOOD_SPEC, { input_tokens: 1500, output_tokens: 900 })
    );

    const res = makeRes();
    await handler({ method: "POST", body: { summary: SUMMARY } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe("claude");
    expect(res.body.model).toBe("claude-opus-4-8");
    expect(isValidPptxBase64(res.body.pptxBase64)).toBe(true);
    expect(res.body.filename).toMatch(/\.pptx$/);
    expect(res.body.mimeType).toMatch(/presentationml\.presentation/);
    // FR-E1: usage captured on the successful Claude call.
    expect(res.body.usage).toEqual({
      input_tokens: 1500,
      output_tokens: 900,
      total_tokens: 2400,
    });
  });

  it("passes the run summary + style guide into the Claude prompt (FR-G3b)", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    createMock.mockResolvedValue(claudeReturning(GOOD_SPEC));

    const res = makeRes();
    await handler({ method: "POST", body: { summary: SUMMARY } }, res);

    expect(createMock).toHaveBeenCalledTimes(1);
    const args = createMock.mock.calls[0][0];
    expect(args.model).toBe("claude-opus-4-8");
    // No banned params (per the claude-api skill for claude-opus-4-8).
    expect(args).not.toHaveProperty("temperature");
    expect(args).not.toHaveProperty("top_p");
    expect(args.thinking).toEqual({ type: "adaptive" });
    expect(args.output_config.format.type).toBe("json_schema");

    const userMsg = args.messages.find((m) => m.role === "user").content;
    expect(userMsg).toContain(SUMMARY.hypothesis);
    expect(userMsg).toContain("4.8%");
    expect(userMsg).toContain("Social");
    expect(userMsg).toContain("Confident, plain, evidence-led"); // style guide text
  });
});

describe("FR-G3 fallback (Section 6) — graceful, never a crash", () => {
  it("falls back to a valid .pptx when Claude returns malformed output", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "totally not json" }],
      usage: { input_tokens: 100, output_tokens: 5 },
    });

    const res = makeRes();
    await handler({ method: "POST", body: { summary: SUMMARY } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe("fallback");
    expect(res.body.reason).toBe("claude_output_invalid");
    expect(isValidPptxBase64(res.body.pptxBase64)).toBe(true);
    // Usage is still captured even though the spec was unusable (FR-E1).
    expect(res.body.usage.input_tokens).toBe(100);
  });

  it("falls back to a valid .pptx when the Claude call throws", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    createMock.mockRejectedValue(new Error("network down"));

    const res = makeRes();
    await handler({ method: "POST", body: { summary: SUMMARY } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe("fallback");
    expect(res.body.reason).toBe("claude_upstream_error");
    expect(isValidPptxBase64(res.body.pptxBase64)).toBe(true);
  });

  it("renders the deterministic deck with NO key (never calls Claude)", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const res = makeRes();
    await handler({ method: "POST", body: { summary: SUMMARY } }, res);

    expect(createMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe("fallback");
    expect(res.body.reason).toBe("not_configured");
    expect(res.body.model).toBeNull();
    expect(isValidPptxBase64(res.body.pptxBase64)).toBe(true);
    // No fabricated spend with no call.
    expect(res.body.usage).toEqual({ input_tokens: 0, output_tokens: 0, total_tokens: 0 });
  });

  it("rejects non-POST", async () => {
    const res = makeRes();
    await handler({ method: "GET" }, res);
    expect(res.statusCode).toBe(405);
  });

  it("never leaks the API key into the JSON response (secrets stay server-side)", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-secret-xyz";
    createMock.mockResolvedValue(claudeReturning(GOOD_SPEC));

    const res = makeRes();
    await handler({ method: "POST", body: { summary: SUMMARY } }, res);

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("sk-ant-secret-xyz");
  });
});
