# references/design-system — Style guides, tokens, brand

## Scope
The **supplied design system** that constrains generated variants: design tokens, component specs, typography, color, spacing, tone of voice, and brand rules. This is the user-supplied "this is our style, stick to it" artifact plus any internal Beagle design tokens.

## Consumed by
- **Agents:** `beagle-hero-visuals`, the hypothesis/proposal implementer, and the reporting implementer.
- Cross-read by `beagle-lead` (guardrail reconciliation) and `beagle-ui-ux`.

## FR IDs this informs
- **FR-C2** — proposals must honour the supplied design system (tokens, components, tone).
- **FR-F2** — the style-guide guardrail that feeds FR-C2 generation.
- **FR-G3** — the PowerPoint deck must visibly follow the supplied style guide.
- Supports the guardrail posture in **Section F** generally (style is a hard constraint, not a suggestion).

## What decision this informs
- How a generated hero variant must look so it stays on-brand (the boundary Claude proposals must respect).
- What "conforms to the style guide" concretely means when a reviewer checks FR-C2 / FR-F2 / FR-G3 judgment criteria.

## What to drop here
- **Style guides / brand books** (`.pdf`, `.md`) — the customer's and/or a sample one for testing.
- **Design-token files** (`tokens.json`, exported Tailwind/Style Dictionary config, CSS variables) representing colors, spacing, radii, type scale.
- **Screenshots** of component libraries and brand examples.
- **Links** to live design-system sites / Storybooks in `LINKS.md`.
- **Zips** of a full design-system export or component kit, dropped directly here.

## Conventions
- Links → `LINKS.md`. Token/code exports → `.zip` directly or as plain files (`tokens.json`).
- If multiple design systems exist (ours vs. a sample client's), put each in a clearly named subfolder (`ours/`, `sample-client/`).
- Remember: per Section F, **guardrails win** — if a style rule conflicts with a desired variant, the style rule takes precedence.
