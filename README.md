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

## Tests

`npm test` runs the Vitest suite (`src/lib/__tests__/`). Every `auto`
acceptance criterion has a test; run `npm run build` (zero errors) alongside it.

## Environment Variables

See [.env.example](.env.example). Key vars:

- `VITE_SITE_URL` - absolute URL for link previews on Vercel
- `LLM_API_KEY` - optional; enables AI evolution mode

## Explicitly Out of Scope

Real site embed, real traffic, production statistical rigor, and open-ended LLM-generated UI beyond the constrained design space.
