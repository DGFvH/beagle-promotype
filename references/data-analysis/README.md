# references/data-analysis — Heterogeneity/segment analysis examples & metric definitions

## Scope
Reference material for the analysis layer: how to compute and present per-segment (heterogeneity) results, what "confidence" means for the MVP, and precise metric definitions so numbers are consistent across the app.

## Consumed by
- **Agent:** the analysis/reporting implementer.
- Cross-read by `beagle-integrations` (metric mapping from GA4/Looker) and `beagle-ui-ux` (how to visualize segments).

## FR IDs this informs
- **FR-G2** — heterogeneity analysis across segments + per-segment winner recommendation.
- **FR-G1** — live results analysis (per-variant values, lead, confidence indicator).
- **FR-B2 / FR-B3** — metric definitions (CTR, Conversion) mapped onto `src/lib/metrics.js`.
- **FR-H2 / FR-H3** — feeds the advanced view and unique-hero-per-segment serving.
- Respects **Section 8**: no production-grade statistical rigor — the rough confidence indicator is fine, clearly labelled.

## What decision this informs
- Exactly how CTR / Conversion / time-to-action are defined and computed (so analytics, engine, and reporting agree).
- Which segment dimensions to break down by (e.g. age group, traffic source) and the rule for flagging when a segment diverges from the aggregate.
- How to phrase a per-segment winner recommendation that feeds FR-H3.

## What to drop here
- A `metric-definitions.md` pinning down each metric's formula, direction (higher/lower is better), and source mapping.
- **Worked examples** of heterogeneity analysis (the spec's case: flat aggregate CTR hiding a younger-up / older-down split) — as `.md`, screenshots, or sample data.
- **Sample datasets** (`*.csv` / `*.json`) of per-segment results to test the analysis against — drop directly.
- **Links** to references on segment/heterogeneity analysis and simple confidence indicators in `LINKS.md`.
- **Zips** of analysis notebooks / scripts, dropped directly here.

## Conventions
- Links → `LINKS.md`. Sample data / notebooks → `.csv`/`.json`/`.zip` directly here.
- Keep examples MVP-appropriate: illustrate the rough confidence indicator, not full sequential-testing rigor (out of scope per Section 8).
