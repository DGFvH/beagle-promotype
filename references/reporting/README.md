# references/reporting — Example decks & report layouts

## Scope
Example `.pptx` decks and report layouts that show what a good end-of-test report looks like, so the Claude-generated PowerPoint lands as something presentable in a meeting.

## Consumed by
- **Agent:** the reporting implementer (the FR-G3 PowerPoint route).
- Cross-read by `beagle-lead` and `beagle-ui-ux` (where the "generate report" action lives).

## FR IDs this informs
- **FR-G3** — PowerPoint report generated via a Claude call from the run summary + style guide; must be a valid, openable `.pptx` that visibly follows the style guide.
- Pulls content from **FR-D3** (confirm/reject + numbers) and **FR-G2** (segment/heterogeneity findings).

## What decision this informs
- Deck structure and slide order: what slides exist, what each contains, how the hypothesis / decision / metric movement / segment findings are laid out.
- The bar for "meeting-ready" — what the Claude-produced deck should resemble.

## What to drop here
- **Example `.pptx` decks** of past A/B-test or experiment readouts (anonymize as needed) — drop the file directly.
- **Slide-layout sketches / screenshots** showing the desired structure (title, hypothesis, results, segment breakdown, recommendation).
- A `deck-outline.md` describing the canonical slide sequence we want Claude to follow.
- **Links** to deck templates or presentation-style references in `LINKS.md`.

## Conventions
- Links → `LINKS.md`. Decks/templates → `.pptx` (or `.zip` of assets) directly here.
- Note that branding/visual style for the deck comes from `references/design-system/` (FR-F2) — keep this folder about **structure and content**, defer style to the design system.
