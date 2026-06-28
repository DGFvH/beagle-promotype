# CLAUDE.md — Beagle MVP working guide

Guide for Claude Code sessions in this repo. Keep it open; it is the map, not the territory.

## The project

**Beagle** turns a website's hero section into a self-improving A/B test loop: connect a
real page + real analytics, let **Claude** propose a hero variant and a hypothesis that
respects a supplied design system and guardrails, inject it with cookie-based variant
assignment, read real results back, and analyze them (including per-segment heterogeneity).

The repo today is the **pitch demo** (synthetic traffic, a nav-menu design space, a seeded
8-round experiment). The MVP work converts that simulation into the real loop above.

**Stack:** React 18 + Vite 6 + Tailwind CSS v4, lucide-react, recharts (lazy lineage chart),
and Vercel serverless functions under `api/` for any secret-bearing calls (model/analytics).

## Source of truth

`BEAGLE_MVP.md` is the **single source of truth**. Read it before any feature work.
- Requirements are `FR-*` with explicit acceptance criteria; a requirement is "done" only
  when every one of its `- [ ]` criteria passes.
- Each criterion is tagged `auto` (provable by test/build/script), `manual` (walk the flow),
  or `judgment` (quality call — produce evidence: screenshot, logged prompt+response, rationale).
- Section 7 maps requirement areas to likely touch points. Section 8 lists what is **out of scope** —
  do not build it; leave clean extension points.

## Hard rules (non-negotiable)

1. **Guardrails win.** Supplied guardrails (legal limits, style guide, do-not-change /
   immutable list — `FR-F1..F3`) are hard constraints on everything generated, injected, or
   auto-approved. If a requirement conflicts with a guardrail, the guardrail wins and you must
   **surface the conflict, never resolve it silently**.
2. **Secrets stay server-side.** No analytics or model API key ever ships to the browser.
   Route secret-bearing calls through `api/` (mirror `api/propose-challenger.js`).
3. **Stay in MVP scope (Section 8).** No auto-approval, no unattended test queue, no
   open-ended model-generated UI beyond the hero design space + supplied design system.
4. **Fail safely.** Every external integration shows clear error states — no crashes, no
   fabricated data presented as real.

## Agent team

`beagle-lead` orchestrates; specialists own their domain. Hand work to the owner; the lead
sequences and resolves cross-cutting calls.

| Agent | Owns |
| --- | --- |
| **beagle-lead** | Orchestration: plans the work, splits by `FR-*`, sequences specialists, integrates, owns the verification pass. |
| **beagle-integrations** | Source + analytics + model connections: GitHub/WordPress/Framer (FR-A1/A3), GA4/Looker (FR-B1..B3), the `api/` Claude routes, injection + experiment readout (FR-D2/D3). |
| **beagle-hero-visuals** | OUR marketing site's hero (the landing page in `src/components/Hero.jsx` etc.) — **not** the user's hero under test. Visual polish of Beagle's own pitch surface. |
| **beagle-ui-ux** | App views and flows: setup, approval gate, hero+data view, advanced/segment views, reporting triggers (FR-H1..H3, FR-D1/D4). |
| **beagle-data-analysis** | Metrics, winner selection, confidence, heterogeneity/per-segment analysis, reporting content (FR-B2/B3, FR-G1..G3). |
| **beagle-guardrails** | Legal/style/immutable enforcement (FR-F1..F3); the guardrails module consumed by proposal + injection paths. Has final say where guardrails apply. |
| **beagle-hypothesis** | Claude proposal + hypothesis quality (FR-C1/C2): prompt design, output validation/sanitisation, design-system conformance. |

## references/ folder

Holds the supplied inputs and fixtures the agents reason over — design system tokens, style
guides, legal-limits docs, do-not-change lists, and sample analytics/hero fixtures. Treat it
as **read-mostly context**: guardrail and hypothesis work pulls from here. If it does not yet
exist, create it when a requirement first needs a supplied artifact, and note its contents.

## Verification workflow

A change is not done until it is verified at the level its criteria demand:

1. **Build must pass.** `npm run build` — zero errors. (`auto` quality bar.)
2. **Browser smoke check.** `npm run smoke` runs `scripts/smoke.mjs` (Playwright, headless
   Chromium). It reuses a dev server at `BASE_URL` (default `http://localhost:5173`) or starts
   `npm run dev` itself and tears it down. It loads `/` (asserts the hero `<h1>`) and
   `/?walkthrough=1` (asserts the app shell mounts), captures console/page errors, and writes
   screenshots to `smoke-artifacts/`. Exits non-zero on failure.
   - The browser is pre-installed (`PLAYWRIGHT_BROWSERS_PATH`). **Never run
     `playwright install`.** The pinned `playwright` version must match the pre-installed
     Chromium build (currently revision 1194 → `playwright@1.56.x`).
3. **Automated tests** for every criterion marked `auto`; extend tests so they stay provable.
4. **Evidence** for `manual` / `judgment` criteria: a screenshot, a logged prompt+response,
   or a short rationale attached to the change — not a silent pass.
5. **No core-loop regression.** The test → measure → decide → evolve loop and lineage chart
   must still work against the new hero design space.

Demo routes (for manual checks): `/`, `/?walkthrough=1`, `/?demo=1`, `/?present=1`.

## Repo orientation

- `src/lib/engine.js` — optimisation loop + design space (currently nav-menu; moving to hero).
- `src/lib/metrics.js` — `ctr`, `conversion`, `timeToAction` + direction-aware `isBetter`.
- `src/lib/challenger.js`, `api/propose-challenger.js` — challenger generation (LLM path to
  retarget at Claude + hero + design system).
- `src/lib/demoSeed.js`, `src/lib/walkthrough.js` — seeded demo data and walkthrough beats.
- `src/components/` — views (Dashboard, Timeline/lineage, Setup, Hero, MethodologyModal, …).
- `api/` — Vercel serverless functions; the only place secrets live.
- `scripts/smoke.mjs` — the browser smoke test described above.
