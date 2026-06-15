# Live Demo Script

Use this when showing **beagle** in a meeting. The recommended flow is the guided walkthrough: eight rounds already decided, generation 9 in progress, then a live decision and lineage proof.

## Links

| Use case | URL |
| --- | --- |
| Guided pitch walkthrough | `https://YOUR_DOMAIN/?walkthrough=1` |
| Landing hero | `https://YOUR_DOMAIN/` |
| Legacy direct demo | `https://YOUR_DOMAIN/?demo=1` |
| Present mode | `https://YOUR_DOMAIN/?present=1` |

`?present=1` loads the populated demo, starts autoplay at 1x, and keeps the walkthrough rail collapsed by default.

## Before the Meeting

1. Open `?walkthrough=1` once on the presentation machine and confirm the rail appears.
2. Click the Lineage step once so the lazy chart chunk loads.
3. Browser zoom 100%, hide bookmarks bar.
4. Optional offline backup: `npm run build && npm run preview`.
5. If using AI evolution, verify the AI toggle dot is green. Without `LLM_API_KEY`, stay on Simulated.

## 5-Minute Flow

| Time | Do | Say |
| --- | --- | --- |
| 0:00 | Open `/` or `?walkthrough=1` | "beagle turns UI testing into a loop: test, measure, decide, evolve." |
| 0:30 | Step 1: Promise | "This is not a static A/B test. The system keeps generating the next challenger from what just won." |
| 1:00 | Step 2: Evolution | "The iteration rail shows every generation, so we can show the path, not just the result." |
| 1:30 | Step 3: Live G9 | "Generation 9 is running now. The champion is defending against a generated challenger." |
| 2:15 | Use 1x Autoplay | "The round window fills slowly enough to watch the live generation move." |
| 3:00 | Click Decide & evolve | "The winner is recorded and generation 10 is created from that winning interface." |
| 3:30 | Step 5: Lineage | "Every generation leaves proof: metric, winner, loser, mutation, and rationale." |
| 4:30 | Step 6: Methodology | "Traffic is simulated for speed. The loop, rendering, lineage, and optional AI proposal path are real." |

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| Space | Toggle autoplay |
| D | Decide & evolve |
| V | Live tab |
| L | Lineage tab |
| M | Methodology modal |
| R | Reset demo to populated state |

## Presenter Notes

- The walkthrough rail only changes views and opens methodology. It does not decide rounds for you.
- Use `?present=1` for a slower hands-off recording or conference monitor loop.
- Use the header Walkthrough button if you opened `?demo=1` and want the guided rail.
- Reset demo restores generation 9 with the completed lineage intact.

## Failure Paths

| Problem | Fix |
| --- | --- |
| Lineage chart empty | You started a fresh experiment. Click Reset demo or reopen `?walkthrough=1`. |
| Autoplay seems stuck | Click Fill window, then Decide & evolve, or press D. |
| No network | Run `npm run preview` locally from a pre-built `dist/`. |
| AI toggle gray | Expected without `LLM_API_KEY`; stay on Simulated. |
| Meeting starts on the wrong step | Use the walkthrough rail buttons or reopen `?walkthrough=1`. |

## After the Meeting

- Click Reset demo before the next audience.
- Capture updated deck assets using [CAPTURE.md](CAPTURE.md).
