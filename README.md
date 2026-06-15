# beagle — navigate your UI to what works

**beagle** runs continuous, automated A/B testing on a website's UI and improves it over generations with no human in the loop. You state what to optimize; the tool runs test → measure → decide → evolve on repeat until the design converges on better performance.

This repository is the **interactive demo**: simulated traffic, optional LLM evolution, and a pre-populated experiment (8 completed rounds + generation 9 in progress).

## Quick start (local)

```bash
npm install
npm run dev
```

Open `http://localhost:5173/?demo=1` to skip the landing page and load the populated demo directly.

## Show the demo

| Resource | Purpose |
|----------|---------|
| [DEMO.md](DEMO.md) | 5-minute presenter script, shortcuts, failure paths |
| [CAPTURE.md](CAPTURE.md) | Screenshot / GIF checklist for your pitch deck |
| [DEPLOY.md](DEPLOY.md) | Vercel deploy, env vars, share URLs |

**Share URL for firms:** `https://YOUR_DOMAIN/?demo=1`  
**Present mode (autoplay 4×):** `?present=1`

## Demo flow

1. **`?demo=1`** — populated experiment: generation 9 live, 8 rounds in lineage, CTR ~38% → 69%.
2. **Live** — two variants with real rendered menu previews; config chips show align, weight, icons, spacing, style.
3. **Autoplay** — finishes the round, decides winner, breeds next challenger (best at 4×).
4. **Lineage** — chart + per-generation winners, losers, rationales.
5. **Methodology** — honest disclosure of what's simulated vs real.

Keyboard shortcuts (when experiment is running): **Space** autoplay · **D** decide · **V** live · **L** lineage · **M** methodology · **R** reset demo.

## Configure a fresh experiment

From the landing page: **Configure new experiment** → name, goal metric, variant gallery → **Start fresh experiment**.

## Tech stack

- React + Vite + Tailwind CSS v4
- Recharts (lineage chart, lazy-loaded)
- Vercel serverless function for optional LLM (`api/propose-challenger.js`)

## Environment variables

See [.env.example](.env.example). Key vars:

- `VITE_SITE_URL` — absolute URL for link previews (set on Vercel)
- `LLM_API_KEY` — optional; enables AI evolution mode

## Explicitly out of scope (demo)

Real site embed, real traffic, statistical rigor (sequential testing, bandits), and open-ended LLM-generated UI beyond the constrained design space.
