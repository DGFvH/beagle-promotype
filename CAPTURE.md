# Capturing Assets for the Pitch Deck

The app now uses a crisp light SaaS palette. Captures work best on white or very light gray slides.

## Setup

- Window 1440 x 900, zoom 100%
- Also check a mobile-width capture around 390 x 844 if the deck needs responsive proof
- Hide bookmarks bar and browser extensions
- Use `http://localhost:5173/` locally or your production URL

## Shots in Deck Order

1. **Hero** - `/`. Capture the large beagle brand signal, headline, Start walkthrough CTA, and product stage.
2. **Walkthrough start** - `?walkthrough=1`. Capture the rail on Step 1 with the live dashboard visible underneath.
3. **Live dashboard** - Step 3 or Live tab. Show generation 9, the iteration rail, champion/challenger cards, and the compact controls.
4. **Decision moment** - Fill the window or use autoplay, then capture the decision-ready banner before clicking Decide & evolve.
5. **Post-decision** - Click Decide & evolve and capture the winner banner plus the new challenger rationale.
6. **Lineage proof** - Walkthrough Step 5 or Lineage tab. Capture the chart and generation records.
7. **Methodology** - Walkthrough Step 6 or header Methodology. Capture Implemented, Simulated, and Roadmap sections.
8. **Variant gallery** - Configure from the hero, then scroll to the gallery if a setup slide is needed.

## GIF Option

Record 25-35 seconds of `?present=1`: the populated demo loads, 1x autoplay visibly fills generation 9, the round decides, and the next generation appears. Trim tightly and loop.

## Autoplay Timing

Generation 9 starts earlier in its sample window. In present mode at 1x, the first decision is intentionally slower so the iteration and progress changes are visible.

## OG / Link Preview Asset

`public/og-image.png` is the 1200 x 630 link preview image. Regenerate it if branding changes, and set `VITE_SITE_URL` on Vercel so Slack and LinkedIn resolve the image.

## Presenter Reference

See [DEMO.md](DEMO.md) for the walkthrough script and keyboard shortcuts.
