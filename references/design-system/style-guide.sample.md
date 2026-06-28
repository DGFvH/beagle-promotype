# Style guide — SAMPLE (FR-F2 / FR-C2)

> **Sample fixture** used by the guardrails module (`getStyleGuide`) and tests.
> The style guide is **surfaced to the proposal prompt** (FR-F2b/FR-C2a) so Claude
> generates on-brand variants. In the MVP it is not auto-checked for conformance
> (that is a `judgment` criterion, FR-F2c); it is reliably *fed in*.

## Voice & tone
- Confident, plain, evidence-led. No hype, no exclamation marks.
- Short sentences. Speak to a busy growth/marketing lead.

## Copy
- Sentence case for headlines and CTAs (not Title Case, not ALL CAPS).
- Headlines: one clear benefit, under ~8 words.
- CTAs: action-first verbs ("Get started", "Book a demo").

## Visual
- Primary CTA is the only solid/high-emphasis button in the hero.
- Generous whitespace; left- or split-aligned heroes preferred over centered for dense copy.
- Supporting media should clarify the product, not decorate.

## Brand guardrail
Per Section F, this style guide is a **hard constraint**: if a desired variant
conflicts with a style rule, the style rule wins and the conflict is surfaced.
