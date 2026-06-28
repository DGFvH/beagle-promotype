# references/ui-ux — App UI/UX inspiration and flows

## Scope
In-product UI and UX for the Beagle **application** (the tool the customer logs into), not the marketing site. Covers the end-to-end operator experience: connecting a source, the approval gate, and how results are presented.

## Consumed by
- **Agent:** `beagle-ui-ux` (primary)
- Cross-read by `beagle-lead` for flow/sequencing decisions and by `beagle-hero-visuals` for in-app preview surfaces.

## FR IDs this informs
- **FR-A1 / FR-B1** connect flow (source + analytics connection wizards).
- **FR-D1** approval gate UX (the explicit "Approve" moment — the only path to go live).
- **FR-D4** agentic-loop toggle UX.
- **FR-H1** hero + data view.
- **FR-H2** advanced data view (lineage + segment breakdown).
- **FR-H3** unique-hero-per-target-group view.
- Supports **FR-E1** internal token-spend panel placement.

## What decision this informs
- How the connect → analytics → metric → propose → approve → results flow is laid out and sequenced.
- How the approval gate reads so a user never goes live by accident.
- How champion-vs-challenger and per-segment results are visualized (FR-H1/H2/H3).

## What to drop here
- **Screenshots / Figma exports** of onboarding wizards, connection flows, approval/confirmation dialogs, A/B dashboards, and segment breakdown UIs we want to emulate.
- **Flow diagrams** (whiteboard photos, exported flowcharts) of the connect flow and approval gate — name them `flow-connect.png`, `flow-approval-gate.png`, `flow-results.png`.
- **Links** to good reference apps (analytics dashboards, experimentation tools like Optimizely/VWO/PostHog) in `LINKS.md`, each with a note on which screen/interaction to study.
- **Zips** of any HTML/React UI prototype to learn from, dropped directly here.

## Conventions
- Links → `LINKS.md`. Code/prototype snapshots → `.zip` directly in this folder.
- Tag each reference with the FR/view it informs (e.g. `# FR-H2 advanced view`).
