// ---------------------------------------------------------------------------
// Serverless proxy: real LLM challenger generation
// ---------------------------------------------------------------------------
// Runs on Vercel (Node serverless). The API key lives ONLY here, server-side,
// and is never shipped to the browser. The client calls this endpoint when the
// user flips the generation mode to "AI"; if no key is configured (or anything
// fails) the client silently falls back to the local simulated stub.
//
// Provider is OpenAI-compatible by default but configurable via env:
//   LLM_API_KEY   (required to enable AI mode)
//   LLM_API_BASE  (default https://api.openai.com/v1)
//   LLM_MODEL     (default gpt-4o-mini)
//
// The design space is enum-constrained, so the model can only ever return one
// of a handful of safe configs — there is no arbitrary HTML to render.

const ALIGNS = ["left", "center", "right"];
const WEIGHTS = ["normal", "bold"];
const SPACINGS = ["compact", "comfortable", "loose"];
const NAV_STYLES = ["plain", "underline", "pills"];

const GOAL_TEXT = {
  ctr: "maximize the menu click-through rate (share of visitors who click the menu)",
  conversion: "maximize the conversion rate (share of visitors who complete the target action)",
  timeToAction: "minimize time-to-action (average seconds before a visitor clicks the menu)",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    // Signal to the client that AI mode is unavailable -> it falls back to stub.
    return res.status(501).json({ error: "not_configured" });
  }

  const base = process.env.LLM_API_BASE || "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const winner = normalizeWinner(body?.winner);
  const goal = body?.goal ?? "ctr";
  const history = Array.isArray(body?.history) ? body.history : [];

  const prompt = buildPrompt(winner, goal, history);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const resp = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an expert conversion-rate-optimization designer running an " +
              "automated A/B testing loop. You propose the next challenger UI variant. " +
              "Respond ONLY with strict JSON matching the requested schema.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return res.status(502).json({ error: "upstream_error", status: resp.status, detail: detail.slice(0, 500) });
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = safeParse(raw);
    const config = sanitizeConfig(parsed?.config ?? parsed, winner);
    const rationale =
      typeof parsed?.rationale === "string" && parsed.rationale.trim()
        ? parsed.rationale.trim().slice(0, 280)
        : "Model proposed this variant based on the winning design and goal.";

    return res.status(200).json({ config, rationale, source: "llm", model });
  } catch (err) {
    const aborted = err?.name === "AbortError";
    return res.status(502).json({ error: aborted ? "timeout" : "request_failed" });
  }
}

function buildPrompt(winner, goal, history) {
  const lineage = history
    .slice(-8)
    .map((r) => {
      const c = r.winnerConfig ?? r.config ?? {};
      const val = r.winnerValue != null ? ` (metric=${round(r.winnerValue)})` : "";
      return `  - Gen ${r.generation}: won align=${c.align}, weight=${c.weight}, icon=${!!c.icon}, spacing=${c.spacing ?? "comfortable"}, navStyle=${c.navStyle ?? "plain"}${val}`;
    })
    .join("\n");

  return [
    `Goal: ${GOAL_TEXT[goal] ?? goal}.`,
    "",
    "Design space for a website navigation menu (you must stay within these):",
    `  - align: one of ${ALIGNS.join(", ")}`,
    `  - weight: one of ${WEIGHTS.join(", ")}`,
    "  - icon: boolean (whether menu items show a leading icon)",
    `  - spacing: one of ${SPACINGS.join(", ")}`,
    `  - navStyle: one of ${NAV_STYLES.join(", ")}`,
    "",
    "Current winning variant (the champion to beat):",
    `  align=${winner.align}, weight=${winner.weight}, icon=${winner.icon}, spacing=${winner.spacing}, navStyle=${winner.navStyle}`,
    "",
    history.length ? `History of what has won so far:\n${lineage}` : "No prior history yet.",
    "",
    "Propose ONE new challenger variant likely to beat the champion on the goal.",
    "Prefer changing a single attribute so the experiment isolates the effect,",
    "and avoid repeating a configuration that already lost.",
    "",
    'Respond with strict JSON: {"config":{"align":"...","weight":"...","icon":true|false,"spacing":"...","navStyle":"..."},"rationale":"one concise sentence"}',
  ].join("\n");
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    // Try to extract the first {...} block.
    const m = String(s).match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return {};
      }
    }
    return {};
  }
}

// Force the model output back into the valid enum space; fall back to the
// winner's value for any attribute the model got wrong.
function normalizeWinner(w) {
  return {
    align: ALIGNS.includes(w?.align) ? w.align : "left",
    weight: WEIGHTS.includes(w?.weight) ? w.weight : "normal",
    icon: typeof w?.icon === "boolean" ? w.icon : false,
    spacing: SPACINGS.includes(w?.spacing) ? w.spacing : "comfortable",
    navStyle: NAV_STYLES.includes(w?.navStyle) ? w.navStyle : "plain",
  };
}

function sanitizeConfig(c, winner) {
  const w = normalizeWinner(winner);
  return {
    align: ALIGNS.includes(c?.align) ? c.align : w.align,
    weight: WEIGHTS.includes(c?.weight) ? c.weight : w.weight,
    icon: typeof c?.icon === "boolean" ? c.icon : w.icon,
    spacing: SPACINGS.includes(c?.spacing) ? c.spacing : w.spacing,
    navStyle: NAV_STYLES.includes(c?.navStyle) ? c.navStyle : w.navStyle,
  };
}

function round(n) {
  return Math.round(Number(n) * 1000) / 1000;
}
