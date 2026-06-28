# Beagle MVP — Handoff

Status snapshot and instructions for finishing the MVP. The single source of truth for
requirements is **`BEAGLE_MVP.md`**; this doc says what's **done**, what's **left**, and
exactly how to complete the rest (which all needs credentials/persistence a fresh
local instance can supply).

Branch: `claude/cloud-instance-setup-r82j2q`. Verify any time with:

```bash
npm install
npm run build   # zero errors
npm test        # 182 passing
npm run smoke   # headless-Chromium browser check, 5/5
```

---

## 1. What's done (verified: 182 tests, build clean, smoke 5/5, no secrets in client bundle)

| FR | Status | Notes |
| --- | --- | --- |
| **A1** connect source | ✅ | GitHub fully wired via `api/connect-source.js` (token server-side only); WP/Framer stubbed "coming soon". Secret-free reference stored. |
| **A2** hero design space | ✅ | `HERO_DESIGN_SPACE` (enum-constrained) replaced the nav-menu space; core loop unchanged. |
| **A3** Claude page check | ✅ | `api/check-page.js` → `{found,suitable,reason}`; not-found blocks progress; logged. Live verdict awaits a key. |
| **C1/C2** Claude proposal + hypothesis | ✅ | `api/propose-challenger.js` (Anthropic SDK), design-system/guardrail-aware, validated, graceful fallback. Live output awaits a key. |
| **D1** approval gate | ✅ | `src/lib/approval.js` — approval is the only path to `goLive`; injection/experiment seam left for D2/D3. |
| **D4** agentic-loop toggle | ✅ | Toggle in the UI; decided test proposes next, still approval-gated. |
| **E1** token spend | ✅ | Captured on every Claude call (`extractUsage`); `repo.tokenSpend` for persistence. |
| **F1/F2/F3** guardrails | ✅ | `src/lib/guardrails/` — legal/style/immutables, fails closed, guardrails win. Consumed by proposal; injection backstop `checkInjection` ready. |
| **G1** results analysis | ✅ | `src/lib/analysis.js` — per-variant values, lead, confidence, confirm/reject verdict. |
| **G2** heterogeneity | ✅ | Per-segment breakdown + per-segment winner recommendations (feeds H3). |
| **G3** PowerPoint report | ✅ | `api/generate-report.js` — Claude designs a validated deck spec → real `.pptx` via pptxgenjs; deterministic fallback. Styled deck awaits a key. |
| **H1/H2/H3** views | ✅ | Hero+data, advanced (lineage + segments), per-segment serving display. |
| Our marketing hero | ✅ | Reworked to pitch the real product. |
| Infra | ✅ | Vitest, local `api/` dev runtime (`vite.config.js`), Playwright smoke, agent team (`.claude/agents/`), `references/`. |

---

## 2. What's left (all credential/persistence-gated)

| FR | Blocked on | What to build |
| --- | --- | --- |
| **D2** cookie injection | Supabase (assignments) | Sticky cookie variant assignment + scoped hero injection + kill switch; enforce `checkInjection` at the boundary. |
| **D3** experiment create + readout | Supabase + analytics | Create experiment on approve; read per-variant results back; confirm/reject from real data. |
| **B1/B2/B3** GA4 analytics | GA4 credentials + Supabase | Connect GA4, load real baseline metrics, populate the metric selector from loaded metrics. |
| **H3** segment-aware serving | D2 | Cookie assignment honoring per-segment winners (display already built). |
| Live **judgment** evidence | live `ANTHROPIC_API_KEY` | Capture real Claude output for A3/C1/C2 and a styled deck for G3(d) — on Vercel or with a local key. |
| `public/og-image.png` | (cosmetic) | Likely stale vs new hero; regenerate a 1200×630 (tags/dimensions already correct). |

---

## 3. Architecture & seams (where the remaining work plugs in)

Everything below already exists with clean extension points — the remaining work is **wiring**, not redesign.

- **`src/lib/engine.js` → `loadCurrentHero(opts)`** — champion baseline; FR-A1 connector already fills it from a connected GitHub page.
- **`src/lib/approval.js` → `goLive(gate, onGoLive)`** + **`useExperiment.setGoLiveSeam(fn)`** — the single injection/experiment trigger. D2/D3 supply the real `onGoLive` callback.
- **`src/lib/guardrails/index.js` → `checkInjection(current, proposed, guardrails, {touchedElements})`** — call immediately before injecting (D2). Immutables enforced even if a proposal slipped through.
- **`src/lib/analysis.js`** — `hypothesisVerdict`, `analyzeRound`, `analyzeHeterogeneity`, `perSegmentRecommendations`. Feed it real result rows for G1/G2 over live data.
- **`src/lib/db/repositories.js` → `getRepositories({client?,force?})`** — async repos with the **same interface** as the in-memory stores. Returns Supabase-backed when env is set, else in-memory (so nothing changes until creds exist). Repos: `sources`, `guardrails`, `experiments`, `assignments`, `results`, `tokenSpend`.

### Caller switch-over (TODOs left for the local instance)
- **D2:** `repo.assignments.assign({experimentId, visitorId, variant, segment})` (sticky via unique index) behind the `goLive` seam; run `checkInjection` first.
- **D3:** `repo.experiments.create(...)` on approve; readout via `repo.results.listByExperiment(...)` → `analysis.js`; persist with `repo.experiments.setVerdict(...)`.
- **B:** GA4 adapter writes per-variant/per-segment rows via `repo.results.upsert(...)` (real `value`/`n` — never fabricated; show "metrics unavailable" on empty/odd shapes per FR-B2).
- **E1:** each `api/` Claude route calls `repo.tokenSpend.record({experimentId, route, usage})` using `extractUsage()`.

---

## 4. Supabase setup

1. **Apply the schema** — `supabase/migrations/0001_init.sql`:
   - CLI: `supabase db push` (needs `SUPABASE_ACCESS_TOKEN` + a linked project), **or**
   - paste the file into the Supabase **SQL Editor** and run.
   - Tables: `projects`, `source_connections`, `guardrails`, `experiments`, `variant_assignments` (unique `experiment_id+visitor_id`), `results` (unique `experiment_id+variant+segment+metric`), `token_spend`. RLS enabled on all; service_role (server-side) bypasses it. Broaden anon policies to `auth.uid()` ownership when auth lands.
2. **GitHub/source tokens:** never store secrets in plaintext. `source_connections.secret_ref` is a seam for **Supabase Vault** / an encrypted store — the migration deliberately has **no** plaintext token column. Don't add one.
3. **Follow-up migration:** add a `page_checks` table (or a `located_page.check` column) — the Supabase page-check repo methods are no-op stubs today (in-memory path is complete).

> Note: from a **cloud** Claude session you can't use raw Postgres (`db.<ref>.supabase.co:5432` is IPv6-only and the proxy is HTTPS-only) and OAuth MCP isn't supported. Use `supabase db push`/SQL Editor for schema, the HTTPS Management API, or run this work from a **local** Claude instance. A token-based Supabase MCP (`.mcp.json` already set to `Bearer ${SUPABASE_MCP_TOKEN}`) works if you set that env var in the cloud environment settings.

---

## 5. Environment variables

Secrets live **server-side only** (read inside `api/`), never `VITE_`-prefixed, never committed. Set them in your **Vercel project** (Production + Preview) and, for a local/cloud Claude session, in the **environment settings** (persist across sessions) or a gitignored `.env`. `.env.example` documents them all.

| Var | Where used | Secret? |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | `api/` Claude routes (propose, check-page, report) | yes |
| `ANTHROPIC_MODEL` | optional model override | no |
| `SUPABASE_URL` | both clients | no |
| `SUPABASE_ANON_KEY` | client (RLS-gated) | low |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/` writes (bypasses RLS) | **yes** |
| `SUPABASE_ACCESS_TOKEN` | CLI/Management API migrations; doubles as `SUPABASE_MCP_TOKEN` | yes |
| `VITE_SITE_URL` | OG/link-preview absolute URL | no |
| GitHub PAT | provided per-connect by the user → used server-side in `api/connect-source.js` | yes (not stored plaintext) |

GA4 vars (e.g. `GA4_PROPERTY_ID`, a service-account JSON) are not defined yet — add them with the FR-B adapter.

---

## 6. Agent team & references

Six specialists under `.claude/agents/` (orchestrated by `beagle-lead`): `beagle-integrations`, `beagle-hero-visuals` (OUR site hero), `beagle-ui-ux`, `beagle-data-analysis`, `beagle-guardrails`, `beagle-hypothesis`. Drop human-supplied examples (links/zips/screenshots) into `references/<area>/` — agents read them when a call is hard.

Recommended order to finish: **Supabase env+migration → D3 (experiment create/readout) → D2 (injection/assignment) → B (GA4) → H3 serving → live-key judgment pass → deploy.**
