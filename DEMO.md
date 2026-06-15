# Live demo script (5 minutes)

Use this when showing **beagle** to firms. The populated demo is the default story — eight rounds already decided, generation 9 in progress.

## Links

| Use case | URL |
|----------|-----|
| **Pitch / email** (auto-loads demo) | `https://YOUR_DOMAIN/?demo=1` |
| **Present mode** (demo + autoplay 4×) | `https://YOUR_DOMAIN/?present=1` |
| Landing (choose path) | `https://YOUR_DOMAIN/` |

Replace `YOUR_DOMAIN` with your Vercel production URL (see [DEPLOY.md](DEPLOY.md)).

## Before the meeting

1. Open `?demo=1` once on the presentation machine — confirm chart loads on **Lineage**.
2. Browser zoom **100%**, hide bookmarks bar.
3. Optional offline backup: `npm run build && npm run preview` on your laptop.
4. If using **AI** evolution: verify green dot on the toggle (requires `LLM_API_KEY` on Vercel).

## 5-minute script

| Time | Do | Say |
|------|-----|-----|
| **0:00** | Open `?demo=1` — lands on **Live**, generation 9 | “The product is already mid-experiment: eight rounds completed with no human picking designs.” |
| **0:30** | Point at **two side-by-side previews** + config chips | “These are real UI variants — alignment, weight, icons, spacing, nav style — not abstract scores.” |
| **1:00** | **Lineage** tab — chart + eight rows | “CTR climbed from about 38% to 69% across generations. Each row shows what won, what lost, and what challenger was bred next.” |
| **1:30** | **+X% improved since launch** strip on Live | “One headline number for the business outcome.” |
| **2:00** | Back to **Live** → **Autoplay** at **4×** (or use `?present=1`) | “Watch it finish this round, pick a winner, and evolve the next challenger — fully automated.” |
| **3:00** | Pause autoplay when decision banner appears | “Winner carries forward; new challenger mutates one design dimension with a stated rationale.” |
| **3:30** | **Methodology** (header or **M** key) | “Traffic is simulated for the demo; the loop, rendering, and lineage are real. Here’s the roadmap for statistical rigor and production embed.” |
| **4:30** | Optional: **Evolution → AI** toggle (only if configured) | “Same loop — a model can propose challengers when the API is wired; it falls back safely if not.” |

## Keyboard shortcuts (presenter)

| Key | Action |
|-----|--------|
| **Space** | Toggle autoplay |
| **D** | Decide & evolve |
| **V** | Live tab |
| **L** | Lineage tab |
| **M** | Methodology modal |
| **R** | Reset demo (reloads populated state) |

## Failure paths

| Problem | Fix |
|---------|-----|
| Lineage chart empty | You started a **fresh** experiment — click **Reset demo** or reopen `?demo=1`. |
| Autoplay seems stuck | Click **Fill window** then **Decide & evolve**, or press **D**. |
| No Wi‑Fi | Run `npm run preview` locally from a pre-built `dist/`. |
| AI toggle gray / no green dot | Expected without `LLM_API_KEY` — stay on **Simulated**; do not promise live LLM. |
| Second meeting same tab | **Reset demo** reloads generation 9 with history intact (does not wipe to hero). |

## After the meeting

- **Reset demo** (header) restores the populated state for the next audience.
- Capture updated screenshots per [CAPTURE.md](CAPTURE.md) if the UI changed.
