# beagle - autonomous UI experimentation

**beagle** runs continuous, automated A/B tests on a website UI and improves it over generations. You choose the goal metric; the tool tests, measures, decides, and evolves the next challenger.

This repository is the interactive pitch demo: simulated traffic, optional LLM evolution, a pre-populated experiment with 8 completed rounds, and generation 9 ready to finish live.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/` for the new hero and walkthrough CTA.

## Demo URLs

| URL | Behavior |
| --- | --- |
| `/` | Landing hero with Start walkthrough, Configure, and Methodology actions |
| `/?walkthrough=1` | Loads the populated demo with the guided walkthrough rail collapsed |
| `/?demo=1` | Preserves the existing direct populated demo/autoplay behavior |
| `/?present=1` | Presenter mode: populated demo, autoplay 1x, walkthrough rail collapsed |

## Show the Demo

| Resource | Purpose |
| --- | --- |
| [DEMO.md](DEMO.md) | Presenter script, walkthrough beats, shortcuts, failure paths |
| [CAPTURE.md](CAPTURE.md) | Screenshot and GIF checklist for the pitch deck |
| [DEPLOY.md](DEPLOY.md) | Vercel deploy, environment variables, share URLs |

Keyboard shortcuts while an experiment is running: **Space** autoplay, **D** decide, **V** live, **L** lineage, **M** methodology, **R** reset demo.

## Demo Flow

1. Start from `/` or `/?walkthrough=1`.
2. Use the walkthrough rail: promise, evolution, live generation 9, decision moment, lineage proof, methodology.
3. On Live, use the iteration rail to show the metric path from G1 through the current live generation.
4. Compare champion vs challenger, start 1x Autoplay, then Decide & evolve to create the next generation.
5. Switch to Lineage to show the chart, winning configs, losing configs, rationales, and next challenger mutations.

## Configure a Fresh Experiment

From the landing page: **Configure** -> **Connect your site** (GitHub: paste a repo URL + access token; WordPress/Framer show "coming soon"). Beagle locates the hero page server-side and Claude confirms it can find the page (FR-A3) — a not-found/unsuitable verdict blocks progress. Then name the experiment, choose a goal metric, and **Start fresh experiment**.

## Tech Stack

- React + Vite + Tailwind CSS v4
- lucide-react icons
- Recharts for the lazy-loaded lineage chart
- Vercel serverless functions for all secret-bearing calls (model + source connection)

## Serverless routes (`api/`)

Secrets live ONLY in these server-side functions (Section 6) — the browser calls
the route, the route holds the key.

| Route | Purpose | Secret |
| --- | --- | --- |
| `api/propose-challenger.js` | Claude hero-variant proposal (FR-C1/C2) | `ANTHROPIC_API_KEY` |
| `api/connect-source.js` | Connect a website source + locate the hero page (FR-A1); calls the GitHub API server-side | the user's GitHub token (used server-side, never returned) |
| `api/check-page.js` | Claude "Can we find your page?" sanity check (FR-A3); logs page ref + verdict + reason | `ANTHROPIC_API_KEY` |

Pure, network-free cores live under `api/_lib/` (`source.js`, `checkPage.js`,
`proposal.js`) so validators are unit-testable without a key or live network.
Client orchestration for sources is under `src/lib/sources/` (GitHub wired;
WordPress/Framer stubbed "coming soon" — drop-in extension points).

## Persistence (`src/lib/db/` + `supabase/`)

Optional Supabase Postgres persistence backs FR-D2 (cookie assignment), FR-D3
(experiments + results), FR-B (analytics results), FR-E1 (token spend) and FR-F
(guardrails). It is OFF unless its env vars are set; with no creds Beagle falls
back to the in-memory stores (no behaviour change).

- `supabase/migrations/0001_init.sql` — schema (projects, source_connections,
  guardrails, experiments, variant_assignments, results, token_spend) with RLS
  enabled. Apply with `supabase db push` or paste into the Supabase SQL Editor.
- `src/lib/db/supabaseClient.js` — server (service_role, `api/`-only, bypasses
  RLS) and client (anon) clients; `isSupabaseConfigured()` is the on/off switch.
- `src/lib/db/repositories.js` — repository interface + factory: returns the
  Supabase-backed repo when configured, else the in-memory repo. Existing callers
  are NOT rewired yet (documented TODO for the local instance). The service_role
  key is server-side only and is verified absent from `dist/`.
- Secrets (GitHub tokens, GA4/Looker creds) are NEVER stored in plaintext;
  `source_connections.secret_ref` is a seam pointing at Supabase Vault.

## Tests

`npm test` runs the Vitest suite (`src/lib/__tests__/`). Every `auto`
acceptance criterion has a test; run `npm run build` (zero errors) alongside it.

## Environment Variables

See [.env.example](.env.example). Key vars:

- `VITE_SITE_URL` - absolute URL for link previews on Vercel
- `LLM_API_KEY` - optional; enables AI evolution mode
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` - optional;
  enable Postgres persistence (service-role key is server-side only)
- `SUPABASE_ACCESS_TOKEN` - optional; for CLI migrations (`supabase db push`)

## Explicitly Out of Scope

Real site embed, real traffic, production statistical rigor, and open-ended LLM-generated UI beyond the constrained design space.
