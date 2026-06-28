# references/guardrails — Legal limits & immutable (do-not-change) examples

## Scope
Safety-critical guardrail inputs: example **legal-limits documents** and **do-not-change / immutable lists** that constrain everything the system generates, injects, or proposes. (Style-guide guardrails live in `references/design-system/` since they're shared with FR-C2 generation.)

## Consumed by
- **Agents:** the guardrails implementer, the hypothesis/proposal implementer, and the injection implementer.
- Cross-read by `beagle-lead` — guardrail conflicts must be surfaced, never silently resolved.

## FR IDs this informs
- **FR-F1** — legal-limits document: stored, passed into every generation/injection decision, violations blocked and surfaced.
- **FR-F3** — do-not-change / immutable list: never modified by variants; injection enforces even if a proposal slips through.
- Reinforces **Section 0 (Guardrails win)** and **FR-C1/FR-D2** which must respect these constraints.

## What decision this informs
- The concrete shape/format of a legal-limits doc and an immutable list so the agent knows how to parse and enforce them.
- What a blocked-proposal message should say when a generation would violate a legal limit or touch an immutable element.

## What to drop here
- **Example legal-limits docs** (`.md`/`.pdf`) — e.g. claims that may not be made, regulated wording, accessibility/legal copy that must stay.
- **Example immutable lists** (`immutables.example.md` / `.json`) — e.g. "do not change fonts", "logo must stay top-left", protected DOM selectors.
- **Screenshots** illustrating an element that must never change.
- **Links** to relevant legal/compliance references in `LINKS.md`.

## Conventions
- Links → `LINKS.md`. Docs/lists → drop files directly (`.md`, `.json`, `.pdf`).
- Treat everything here as **hard constraints**. Per Section 0: guardrails take precedence over any conflicting requirement, and conflicts must be surfaced to the user, not silently overridden.
