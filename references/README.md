# references/ — Design inputs for the Beagle MVP

This folder is where the **human drops hard-to-decide design inputs**: links, zips of example code, screenshots, style guides, API docs, example decks, and sample data. It is the shared brain the subagent team reaches for when a decision is genuinely hard.

## Who reads this (the main audience)

The **subagent team** — `beagle-lead` and the implementation agents (`beagle-hero-visuals`, `beagle-ui-ux`, `beagle-integrations`, and the hypothesis/injection/analysis/reporting implementers). **Agents read the relevant folder here BEFORE making a hard call.** When a design or implementation decision is ambiguous, the agent's first move is to consult the matching reference folder rather than guess. If a folder is empty, the agent should say so and ask the human to drop an input — not invent one.

This folder is the canonical home for *taste and external facts*. The product contract still lives in `BEAGLE_MVP.md` (the FR-* requirements and acceptance criteria); this folder supplies the *inputs* that make those requirements decidable.

## The folders

| Folder | What it holds | Main agent(s) | Informs (FR) |
| --- | --- | --- | --- |
| `our-site-hero/` | Inspiration for **OUR** Beagle marketing-site hero. **NOT the client site.** | `beagle-hero-visuals` | (marketing presentation; no FR) |
| `ui-ux/` | In-app UI/UX: connect flow, approval gate, results views | `beagle-ui-ux` | FR-A1/B1, FR-D1/D4, FR-H1/H2/H3 |
| `client-hero-design-space/` | Examples of the **CLIENT** hero variants/design space being optimized | `beagle-hero-visuals`, proposals | FR-A2, FR-C1 |
| `design-system/` | Style guides, tokens, brand | hero-visuals, proposals, reporting | FR-C2, FR-F2, FR-G3 |
| `integrations/` | API docs & auth notes (GitHub / WordPress / Framer / GA4 / Looker) | `beagle-integrations` | FR-A1/A3, FR-B1–B3, FR-D2/D3 |
| `reporting/` | Example `.pptx` decks / report layouts | reporting implementer | FR-G3 |
| `data-analysis/` | Heterogeneity/segment analysis examples + metric definitions | analysis implementer | FR-G1/G2, FR-B2/B3, FR-H2/H3 |
| `guardrails/` | Legal-limits & do-not-change/immutable examples | guardrails/injection implementers | FR-F1, FR-F3 |

### The two heroes — do not confuse them
There are **two different heroes** in this repo, in two different folders, on purpose:
- **`our-site-hero/`** = the hero on **Beagle's own marketing website** (how we sell Beagle). This is OUR site.
- **`client-hero-design-space/`** = the hero on a **customer's website** that Beagle ingests as a baseline and generates A/B variants for (FR-A2, FR-C1). This is the CLIENT site / the thing being optimized.

If you are an agent and you are about to put a customer-hero example into `our-site-hero/` — stop; it belongs in `client-hero-design-space/`, and vice versa.

## Link / zip convention

Every subfolder uses the same three drop mechanisms:

1. **Links → `LINKS.md`.** Add a `LINKS.md` to the folder and put one reference per line, each with a short note on *why it's here / what to learn from it*. A bare URL with no annotation is low-value — always say what the agent should take from it.
2. **Zips of example code → drop the `.zip` file directly in the folder.** No need to unzip. Name it descriptively (e.g. `linear-hero-snapshot.zip`, `ga4-quickstart.zip`).
3. **Screenshots / docs / data → drop the file directly** (`.png`, `.pdf`, `.md`, `.json`, `.csv`, `.pptx`). Use descriptive names and, where it matters, annotate (e.g. label an example as *baseline* vs *variant*, or *good* vs *bad*).

Each folder's own README restates this and lists the specific kinds of inputs that belong there.

## Rules for agents reading this folder

- **Consult before deciding.** Read the relevant folder's README and contents before making a hard design/implementation call.
- **Empty ≠ free rein.** If the needed input is missing, flag it and ask the human; don't fabricate a style guide, legal limit, or API behaviour.
- **Guardrails win.** `guardrails/` and the style-guide in `design-system/` are hard constraints. Per `BEAGLE_MVP.md` Section 0, if a reference conflicts with a requirement, the guardrail takes precedence and the conflict must be surfaced, not silently resolved.
- **No secrets.** `integrations/` holds redacted samples and auth *notes* only. Never commit real tokens/keys; secrets stay server-side (mirroring `api/propose-challenger.js`).
