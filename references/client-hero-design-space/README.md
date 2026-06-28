# references/client-hero-design-space — The CLIENT hero variants being optimized

## Scope: THE CUSTOMER'S HERO, the thing Beagle A/B tests.
> This folder defines the **design space of the client hero** that Beagle generates variants for and optimizes. This is the hero on a *customer's* website (loaded via GitHub/WordPress/Framer), not Beagle's own marketing hero.
>
> ⚠️ **Distinct from `references/our-site-hero/`.** *our-site-hero* = how we market Beagle. *client-hero-design-space* = examples of the customer heroes Beagle ingests as a baseline ("champion") and the variant dimensions Claude is allowed to explore ("challengers").

## Consumed by
- **Agents:** `beagle-hero-visuals` (variant shape & rendering) and the hypothesis/proposal implementer.
- Cross-read by `beagle-lead`.

## FR IDs this informs
- **FR-A2** — focus the optimization target on the hero; define hero-level attributes (headline, subheadline, primary CTA label/style, layout/alignment, supporting media) that replace the demo's nav-menu design space.
- **FR-C1** — Claude proposes a hero variant + hypothesis; this folder shows the realistic range of inputs and acceptable variant moves.

## What decision this informs
- **What the hero design space actually is**: which attributes are variable, what their realistic value ranges are, and what a good vs. bad variant looks like.
- The baseline-hero rendering target (how a real customer hero looks once loaded as the champion).

## What to drop here
- **Screenshots** of real-world customer-style hero sections across industries — both strong and weak examples (annotate which is which).
- **Before/after pairs** showing a baseline hero and a plausible optimized variant (illustrates the allowed design moves for FR-C1).
- **Links** to hero galleries / pattern libraries in `LINKS.md`.
- **Zips** of example hero markup (HTML/JSX + CSS) representing baseline pages Beagle might ingest — drop `.zip` directly.
- A `design-space.md` if the human wants to pin down the explicit attribute list and value ranges.

## Conventions
- Links → `LINKS.md`. Code samples / page snapshots → `.zip` directly here.
- Clearly label each example as **baseline (champion)** or **variant (challenger)** so agents don't confuse the starting point with a proposed change.
