# Capturing assets for the pitch deck

The app uses a **warm light stone** UI. Captures look best on white or light gray slides.

## Setup

- Window **1440 × 900** (or fullscreen 16:9), zoom **100%**
- Hide bookmarks bar and browser extensions
- Load `http://localhost:5173/?demo=1` (or your production URL)

## Shots (deck order)

1. **Landing / hero** — `https://YOUR_DOMAIN/` without query params. beagle wordmark, “Open populated demo” CTA.

2. **Live dashboard (gen 9)** — `?demo=1`. Two side-by-side menu previews (underline champion vs pills challenger), config chips, improvement strip (~+81% since launch), confidence meter.

3. **Lineage chart** — Lineage tab. Forest-green line, “+X% since G1” badge, eight generation rows visible.

4. **Lineage detail** — Crop one row showing Won / Lost / Next challenger with rationale text.

5. **Decision moment** — After **Autoplay** at 4× (or `?present=1`), capture the decision banner + new challenger rationale on the B card.

6. **Methodology modal** — Header → Methodology. “Implemented / Simulated / Roadmap” sections.

7. **Variant gallery** — Configure new experiment → scroll to 8-card gallery.

8. **GIF (optional, high impact)** — Record 15–20s of `?present=1`: metrics filling, round completing, decide, lineage chart tick. Trim and loop for the deck.

## Autoplay recording tip

Use `?present=1` — auto-loads populated demo and starts autoplay at 4×. Gen 9 begins at ~87% of the round window; the first cycle should **decide within ~10–15 seconds**.

## OG / link preview asset

`public/og-image.png` (1200×630) — used when sharing the deploy URL. Regenerate if branding changes; set `VITE_SITE_URL` on Vercel so Slack/LinkedIn resolve the image.

## Presenter reference

See [DEMO.md](DEMO.md) for the full live script and keyboard shortcuts.
