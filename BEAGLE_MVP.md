# Beagle — MVP Specification (Source of Truth)

> **What this document is.** This is the single source of truth for the agentic
> tool that transforms the current `beagle` repository from a *pitch demo* into
> the *MVP* described below. The implementing agent (running in Claude Code)
> reads this file, makes changes to the codebase, and **tests those changes
> against the acceptance criteria here**. A requirement is only "done" when every
> one of its acceptance criteria passes.
>
> Original product notes were written in a mix of Dutch and English; this
> document is the canonical English version. Dutch-specific intent (e.g.
> "Bewijs-vragen", "DIT MAG NIET ALDUS LEGAL") is resolved directly into the
> requirements below.

---

## 0. How the implementing agent must use this document

1. **Acceptance criteria are the contract.** Do not mark a requirement complete
   until all of its `- [ ]` criteria are satisfied and verified.
2. **Verification type is labelled per criterion:**
   - `auto` — provable by an automated test, type check, build, or script.
     Prefer adding/extending tests so these stay provable in CI.
   - `manual` — provable by running the app and walking the flow.
   - `judgment` — requires human or LLM evaluation of output *quality*
     (e.g. "is the hypothesis sensible", "does the variant respect the style
     guide"). For these, produce evidence (a screenshot, a logged prompt +
     response, a short rationale) rather than a silent pass.
3. **Guardrails win.** Section F (Guardrails) constrains everything the agent
   generates or injects. If a requirement here ever conflicts with a guardrail
   the user has supplied, the guardrail takes precedence and the agent must
   surface the conflict instead of resolving it silently.
4. **Stay inside MVP scope.** Section 8 lists what is explicitly *out* of scope.
   Do not build it. Leave clean extension points instead.
5. **Respect the existing architecture.** This is a React + Vite + Tailwind v4
   app with a Vercel serverless function for model calls. Keep that shape unless
   a requirement forces a change, and record any structural change in the repo's
   README.

---

## 1. Product context

### Problem statement
Website landing pages can cause an enormous bounce rate, and teams want them
optimized — but there is very little evidence-based guidance for how to lay out a
hero section. Choosing and running A/B tests by hand costs significant resources
and carries a lot of personal bias. The goal is to make a website perform as well
as possible without the team having to do much work to get there.

### Solution (full product vision)
An agentic, multi-agent system for A/B testing that:
- Connects to your website (GitHub / WordPress / Framer).
- Analyzes your current analytics data.
- Lets you select a KPI.
- Proposes an A/B test with an explicit hypothesis.
- Injects the test code (cookie-based variant assignment).
- Runs the test and gathers evidence for the hypothesis.
- Returns the right data and confirms or rejects the hypothesis.
- Reports results, queues the next test (ready-to-approve or auto-approved), and
  can export reporting to PowerPoint for a meeting.
- At high traffic volume, makes targeted changes per segment (traffic source,
  age, client, etc.).

This document specifies the **MVP slice** of that vision (Sections 4–7). The
broader items above that are *not* in the MVP are listed in Section 8.

---

## 2. Current state of the repository (starting point)

The agent is **not** starting from scratch. The repo today is an interactive
pitch demo. Knowing what already exists prevents rebuilding it.

| Area | What exists today | Relevant files |
| --- | --- | --- |
| Stack | React 18 + Vite 6 + Tailwind CSS v4, lucide-react, recharts | `package.json` |
| Optimisation loop | Test → measure → decide → evolve across "generations", in memory | `src/lib/engine.js` |
| Design space | A constrained **navigation-menu** config: `align`, `weight`, `icon`, `spacing`, `navStyle` (enum-only) | `src/lib/engine.js`, `api/propose-challenger.js` |
| Metrics | `ctr`, `conversion`, `timeToAction` with direction-aware comparison | `src/lib/metrics.js` |
| Traffic | **Synthetic** visitors with a hidden "appeal" ground truth; no real users | `src/lib/engine.js`, `src/lib/stats.js` |
| Challenger generation | Local stub mutation *or* optional LLM proposal (OpenAI-compatible, enum-constrained) | `src/lib/engine.js`, `src/lib/challenger.js`, `api/propose-challenger.js` |
| Configure flow | Name an experiment + pick a goal metric + browse a variant gallery | `src/components/Setup.jsx`, `src/lib/demoSeed.js` |
| Views | Dashboard/Live (champion vs challenger), Lineage/timeline chart, Methodology modal | `src/components/Dashboard.jsx`, `src/components/MethodologyModal.jsx` |
| Seed | 8 completed rounds + generation 9 live, for the pitch | `src/lib/demoSeed.js`, `src/lib/walkthrough.js` |

**Explicitly out of scope in the demo today** (and therefore the core of the MVP
gap): real site embed, real traffic, production statistical rigor, and any
open-ended model-generated UI beyond the constrained design space.

### The MVP gap in one sentence
The MVP turns the demo's *simulation* into a *real* loop: connect a real page and
real analytics, focus the design space on the **hero**, have **Claude** propose a
hero-level hypothesis that respects a supplied design system and guardrails, inject
the variant with cookie-based assignment, read real experiment results back, and
analyze them — including heterogeneity across segments.

---

## 3. MVP user flow (target)

1. **Select the page to improve** — start with the **hero**.
   - Connect Git, WordPress, or Framer (integration required).
   - Sanity check by Claude: "Can we find your page?"
2. **Connect your analytics** (GA4 / Looker — integration required).
   - Confirm the metrics load correctly from the analytics source.
   - Select the metric to improve (e.g. CTR / Conversion).
3. **Metrics loaded → user selects the metric.**
   - The app loads the current homepage / hero.
   - Claude produces a variant + hypothesis based on the chosen metric, the
     current design, and the supplied design system.
   - Hypothesis is shown: *what changed and why.*
4. **Approve.**
   - Code is injected (cookie-based variant assignment).
   - The analytics side creates an experiment.
   - The app reads out the experiment results.
   - The agentic loop can be switched on.
5. **Internally:** token-spend monitoring runs throughout.
6. **Guardrails:** the user can supply a legal-limits doc, a style guide, and a
   "do-not-change" list; the agent must obey all three.
7. **When the test is done:** live data analysis + reporting — including
   heterogeneity analysis across segments and a PowerPoint report for a meeting.

---

## 4. Functional requirements

Each requirement has an ID, a statement, acceptance criteria (with verification
type), and the current state in the repo.

### A. Page connection & integrations

#### FR-A1 — Connect a source for the target page
**Statement.** The user can connect at least one website source — **GitHub**,
**WordPress**, or **Framer** — and the app can locate the page to be optimized.
**Current state.** None. The demo has no real site connection.
- [ ] The UI presents the three source options (GitHub / WordPress / Framer) and lets the user choose one. `manual`
- [ ] **GitHub** is fully wired end to end for the MVP; WordPress and Framer may ship stubbed with a clear "coming soon" state. `manual`
- [ ] Connecting requires and validates whatever credential/URL the chosen source needs; invalid input produces a clear error, not a crash. `auto` `manual`
- [ ] On success, the app stores a reference to the connected source and the located page so later steps can use it. `auto`

#### FR-A2 — Focus the optimisation target on the hero
**Statement.** The MVP optimizes the **hero** section specifically (not the
generic nav-menu design space the demo ships with).
**Current state.** Partial — there is an optimisation loop, but the design space
is a navigation menu, not a hero.
- [ ] The design space / variant model represents hero-level attributes (e.g. headline, subheadline, primary CTA label/style, layout/alignment, supporting media) rather than only nav-menu attributes. `auto`
- [ ] The current hero of the connected page can be loaded and rendered as the baseline ("champion"). `manual`
- [ ] The existing engine, metrics, and lineage continue to function against the new hero design space (no regression in the core loop). `auto`

#### FR-A3 — Claude sanity check: "Can we find your page?"
**Statement.** After connecting a source, Claude confirms whether the target page
can actually be found and is suitable for hero optimization.
**Current state.** None.
- [ ] After connect, the app calls a Claude-backed check that returns a clear found / not-found result with a short human-readable reason. `manual` `judgment`
- [ ] A "not found" or "unsuitable" result blocks progress to the analytics step and tells the user what to fix. `auto` `manual`
- [ ] The check result is logged (input page reference + verdict + reason) for debugging. `auto`

### B. Analytics connection & metric loading

#### FR-B1 — Connect analytics (GA4 / Looker)
**Statement.** The user can connect a real analytics source — **GA4** or
**Looker** — to the connected page.
**Current state.** None. Traffic is synthetic.
- [ ] The UI offers GA4 and Looker as analytics options and walks the user through connecting one. `manual`
- [ ] **GA4** is fully wired for the MVP; Looker may be stubbed with a clear state. `manual`
- [ ] Auth/connection failures surface a clear error and a retry path. `auto` `manual`

#### FR-B2 — Load metrics from the analytics source
**Statement.** Real metrics load correctly from the connected analytics source
for the target page.
**Current state.** None — metrics are computed from synthetic sessions.
- [ ] The app fetches and displays current baseline metric values for the target page from the live analytics source. `manual`
- [ ] The available metrics include at least CTR and Conversion, mapped onto the existing metric model in `src/lib/metrics.js`. `auto`
- [ ] If analytics returns no data or an unexpected shape, the app shows an explicit "metrics unavailable" state instead of silently showing zeros or fake numbers. `auto` `manual`

#### FR-B3 — User selects the metric to improve
**Statement.** Once metrics are loaded, the user selects the single metric to
optimize (e.g. CTR or Conversion).
**Current state.** Partial — `Setup.jsx` already lets the user pick a goal metric
from `METRICS`, but from synthetic data, not loaded analytics.
- [ ] The metric selector is populated from the metrics actually loaded in FR-B2. `auto`
- [ ] The selected metric drives winner selection and reporting downstream (direction-aware, reusing `isBetter`). `auto`

### C. Hypothesis generation (Claude)

#### FR-C1 — Claude proposes a hero variant + hypothesis
**Statement.** Based on the chosen metric, the current hero design, and the
supplied design system, **Claude** proposes a hero variant and an explicit
hypothesis describing *what changed and why*.
**Current state.** Partial — there is an LLM challenger path
(`api/propose-challenger.js`), but it targets the OpenAI API and the enum nav
design space, not Claude and not a hero with a design system.
- [ ] Variant proposals are generated via Claude (the model call routes to Claude; the prompt includes the chosen metric, the current hero, and the design system). `manual` `judgment`
- [ ] The proposal returns both a concrete hero variant and a one-paragraph hypothesis stating the change and the expected effect on the chosen metric. `auto` `judgment`
- [ ] The hypothesis and the diff vs. the current hero are shown to the user before any approval. `manual`
- [ ] Model output is validated/sanitised before use; malformed output falls back gracefully and never injects unvalidated markup (see FR-D2 and Section F). `auto`

#### FR-C2 — Proposals honour the supplied design system
**Statement.** Proposed variants stay within the user's design system (tokens,
components, tone) when one is supplied.
**Current state.** None — the demo constrains to enums only, with no
user-supplied design system.
- [ ] The design system supplied in FR-F2 is passed into the proposal prompt and referenced in generation. `auto`
- [ ] A reviewer can confirm a sample of generated variants visibly conform to the supplied design system. `judgment`

### D. Approval, injection, experiment readout

#### FR-D1 — Explicit approval gate
**Statement.** No variant goes live without the user approving it (MVP is
human-approved; auto-approval is out of scope — see Section 8).
**Current state.** None for real pages.
- [ ] An "Approve" action exists and is the only path that triggers injection + experiment creation. `manual`
- [ ] Until approval, nothing is injected and no live experiment is created. `auto`

#### FR-D2 — Cookie-based code injection
**Statement.** On approval, the variant is injected into the page using
**cookie-based** variant assignment (a returning visitor keeps the same variant).
**Current state.** None — variant rendering is in-memory only.
- [ ] Injection assigns each visitor to champion or challenger and persists that assignment in a cookie so assignment is sticky across visits. `auto`
- [ ] The injected change is scoped to the approved hero variant only and is constrained by Section F guardrails (e.g. immutable elements are never altered). `auto` `judgment`
- [ ] Injection can be cleanly reverted/disabled (kill switch) without leaving the page broken. `auto` `manual`

#### FR-D3 — Experiment creation + result readout
**Statement.** The analytics side creates an experiment for the approved test,
and the app reads the experiment's results back in.
**Current state.** None — results are synthetic.
- [ ] Approving creates/records an experiment tied to the variant and the chosen metric. `auto`
- [ ] The app reads real per-variant results for the chosen metric back from analytics and displays them. `manual`
- [ ] The app states whether the hypothesis is **confirmed or rejected** for the chosen metric, with the supporting numbers. `auto` `manual`

#### FR-D4 — Agentic loop toggle
**Statement.** The user can switch the agentic loop on so the system proposes the
next test after a decision (the demo's evolve-to-next-generation loop, now over
real results).
**Current state.** Partial — the demo already evolves a next challenger; it must
be driven by real results and gated by approval/guardrails.
- [ ] A visible toggle turns the agentic loop on/off. `manual`
- [ ] With the loop on, a decided test produces a next proposed test (still subject to the FR-D1 approval gate in the MVP). `manual`

### E. Internal — token spend monitoring

#### FR-E1 — Track and surface token spend
**Statement.** Model token usage is monitored internally and visible to the team.
**Current state.** None.
- [ ] Every Claude call records token usage (prompt + completion) attributable to an experiment/run. `auto`
- [ ] A running total of token spend is queryable/visible (e.g. an internal panel or logged metric). `auto` `manual`
- [ ] Token accounting does not block or slow the user-facing flow. `manual`

### F. Guardrails (legal, style, immutables)

> These are safety-critical. The agent must treat supplied guardrails as hard
> constraints on everything it generates, injects, or auto-approves.

#### FR-F1 — Legal-limits document
**Statement.** The user can supply a legal-limits document that defines what the
system **may not** do; the system must obey it.
**Current state.** None.
- [ ] The user can upload/provide a legal-limits doc, and it is stored against the project. `manual`
- [ ] The legal limits are passed into every generation/injection decision and constrain them. `auto`
- [ ] A proposal or change that would violate a stated legal limit is blocked and the reason is surfaced to the user — never silently overridden. `auto` `judgment`

#### FR-F2 — Style guide
**Statement.** The user can supply a style guide ("this is our style, stick to
it") that constrains generated variants.
**Current state.** None.
- [ ] The user can provide a style guide, stored against the project. `manual`
- [ ] The style guide feeds FR-C2 generation and is referenced when proposing variants. `auto`
- [ ] A sample of generated variants visibly conforms to the supplied style guide. `judgment`

#### FR-F3 — Do-not-change / immutable list
**Statement.** The user can specify elements that must never change (e.g. "do not
change fonts").
**Current state.** None.
- [ ] The user can declare an immutable list (elements/attributes that must not change). `manual`
- [ ] Generated variants never modify a declared-immutable element, and injection enforces this even if a proposal slips through. `auto`
- [ ] A proposal that touches an immutable is rejected with a clear reason. `auto`

### G. Live data analysis + reporting

#### FR-G1 — Live results analysis
**Statement.** Once a test has run, the app analyzes live results for the chosen
metric and presents a clear decision.
**Current state.** Partial — the demo has a dashboard + lineage, but over
synthetic data.
- [ ] Results view shows per-variant metric values, the lead, and a confidence indicator, computed from real data. `manual`
- [ ] The confirm/reject hypothesis decision (FR-D3) is reflected here with the numbers behind it. `auto` `manual`

#### FR-G2 — Heterogeneity analysis across segments
**Statement.** The app analyzes results **per segment** so that a flat aggregate
does not hide divergent effects. Example: overall CTR is flat, but the challenger
drops CTR for an older segment while improving it for a younger segment — so keep
variant A for the young segment and variant B for the old segment.
**Current state.** None — only a single aggregate metric exists.
- [ ] Results can be broken down by at least one segment dimension available from analytics (e.g. age group, traffic source). `manual`
- [ ] When a segment's effect diverges from the aggregate, the app flags it and recommends a per-segment winner. `judgment`
- [ ] The per-segment recommendation is what feeds the "unique hero per target group" view (FR-H3). `auto`

#### FR-G3 — PowerPoint report for a meeting
**Statement.** Once a test has concluded, the user can generate a PowerPoint
(`.pptx`) report suitable for presenting in a meeting. The deck is produced by a
**Claude instance** given the run's summary information plus the supplied style
guide — a hand-built templated deck builder is **not** required.
**Current state.** None.
- [ ] After a test concludes, the user can trigger generation of a `.pptx` report. `manual`
- [ ] The deck is generated by a Claude call given the run summary (hypothesis, confirm/reject decision, key metric movement, and the segment/heterogeneity findings from FR-G2) plus the supplied style guide (FR-F2). `auto` `manual`
- [ ] The output is a valid, openable `.pptx` ready to present. `auto` `manual`
- [ ] The deck visibly follows the supplied style guide. `judgment`

---

## 5. User-facing views

#### FR-H1 — Hero + data view
**Statement.** A primary view shows the current/variant hero alongside its key
metric data.
**Current state.** Partial — there is a champion-vs-challenger dashboard, but not
a hero-focused view over real data.
- [ ] One view places the hero (champion and challenger) next to the live metric data for the chosen metric. `manual`

#### FR-H2 — Advanced data view
**Statement.** A more advanced view exposes deeper analytics, including the
segment/heterogeneity breakdown.
**Current state.** Partial — lineage/timeline chart exists; segment depth does
not.
- [ ] An advanced view exposes the lineage/history plus the per-segment breakdown from FR-G2. `manual`

#### FR-H3 — Unique hero per target group
**Statement.** Based on heterogeneity analysis, the system can serve a different
hero variant per target group.
**Current state.** None.
- [ ] The app can express and display "serve variant X to segment A, variant Y to segment B" derived from FR-G2. `manual`
- [ ] Cookie-based assignment (FR-D2) supports segment-aware serving for the segments in scope. `auto`

---

## 6. Non-functional / quality bars

- [ ] `npm run build` passes with no errors after changes. `auto`
- [ ] The existing core loop (test → measure → decide → evolve, lineage charting) still works for the new hero design space — no regression. `auto`
- [ ] No secret (analytics or model API keys) is ever shipped to the browser; secrets stay server-side, mirroring the existing `api/propose-challenger.js` pattern. `auto`
- [ ] Every external integration (source, analytics, model) fails *safely* — clear error states, no crashes, no fabricated data presented as real. `auto` `manual`
- [ ] Each newly built requirement has at least one automated test where its acceptance criteria are marked `auto`. `auto`

---

## 7. Repository mapping (where the work lands)

A guide, not a constraint — the agent may restructure with reason.

| Requirement area | Likely touch points |
| --- | --- |
| Hero design space (FR-A2, FR-C1) | `src/lib/engine.js`, `src/lib/demoSeed.js`, variant/preview components |
| Source integrations (FR-A1, FR-A3) | new module(s) under `src/lib/` + a serverless function under `api/` for any secret-bearing calls |
| Analytics integrations (FR-B1–B3) | new `src/lib/analytics/` module + `api/` function; metric mapping in `src/lib/metrics.js` |
| Claude proposals (FR-C1–C2) | adapt `api/propose-challenger.js` (or add an `api/` route) to call Claude with metric + hero + design system; `src/lib/challenger.js` orchestration |
| Injection + experiment (FR-D2–D3) | new injection module + `api/` function; cookie handling |
| Token monitoring (FR-E1) | wrap model calls in the `api/` layer; surface in an internal view |
| Guardrails (FR-F1–F3) | a guardrails module consumed by proposal + injection paths; upload UI |
| Heterogeneity + views (FR-G2, FR-H1–H3) | `src/components/` views + analytics segment queries; extend the recharts lineage view |
| PowerPoint report (FR-G3) | a Claude-backed `api/` route that returns a `.pptx` from the run summary + style guide; trigger from the results view |

---

## 8. Out of scope for the MVP (do not build)

These are part of the full vision but **not** the MVP. Leave extension points,
don't implement:
- Automatic approval of tests (MVP is human-approved only — FR-D1).
- A fully autonomous, never-ending multi-test queue running without approval.
- Volume-triggered automatic per-segment targeting beyond the MVP's
  heterogeneity *analysis* + manual per-segment serving (FR-G2, FR-H3).
- Open-ended, fully model-generated UI beyond the hero design space and the
  supplied design system.
- Production-grade statistical rigor (sequential testing, multi-armed bandits,
  multiple-comparison control, power analysis, novelty/seasonality guards).
  The MVP may keep the existing rough confidence indicator, clearly labelled.

---

## 9. Consolidated acceptance checklist

Use this as the test pass. Group is "done" only when all its items pass.

**A. Page & hero**
- [ ] FR-A1 Connect GitHub/WordPress/Framer (≥1 fully wired)
- [ ] FR-A2 Hero design space + baseline hero loads, no loop regression
- [ ] FR-A3 Claude "can we find your page" gate

**B. Analytics**
- [ ] FR-B1 Connect GA4/Looker (≥1 fully wired)
- [ ] FR-B2 Real metrics load (incl. CTR, Conversion)
- [ ] FR-B3 User selects metric from loaded metrics

**C. Hypothesis**
- [ ] FR-C1 Claude proposes hero variant + hypothesis (validated output)
- [ ] FR-C2 Proposals honour the design system

**D. Approval / injection / readout**
- [ ] FR-D1 Approval gate is the only path to go live
- [ ] FR-D2 Cookie-based, scoped, revertible injection
- [ ] FR-D3 Experiment created + real results read + confirm/reject
- [ ] FR-D4 Agentic loop toggle (still approval-gated)

**E. Internal**
- [ ] FR-E1 Token spend monitored + visible

**F. Guardrails**
- [ ] FR-F1 Legal-limits doc obeyed + violations blocked
- [ ] FR-F2 Style guide applied
- [ ] FR-F3 Immutable list enforced

**G. Analysis & reporting**
- [ ] FR-G1 Live results analysis over real data
- [ ] FR-G2 Heterogeneity / per-segment analysis + per-segment winner
- [ ] FR-G3 PowerPoint report generated via Claude + style guide

**Views**
- [ ] FR-H1 Hero + data view
- [ ] FR-H2 Advanced data view
- [ ] FR-H3 Unique hero per target group

**Quality bars**
- [ ] Build passes, no core-loop regression, secrets server-side, safe failures, tests for `auto` criteria
