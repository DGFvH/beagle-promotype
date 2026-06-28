# references/integrations — API docs & auth notes

## Scope
Third-party integration reference: API documentation, auth/OAuth flows, scopes, rate limits, and request/response shapes for every external system Beagle connects to — **GitHub, WordPress, Framer, GA4, Looker**.

## Consumed by
- **Agent:** `beagle-integrations` (primary)
- Cross-read by `beagle-lead` for sequencing which integration is wired first.

## FR IDs this informs
- **FR-A1** — connect a source (GitHub fully wired; WordPress/Framer may stub).
- **FR-A3** — locating the page (what each source API exposes for finding the hero page).
- **FR-B1 / FR-B2 / FR-B3** — connect analytics (GA4 fully wired; Looker may stub) and load real metrics (CTR, Conversion).
- **FR-D2 / FR-D3** — injection target + experiment creation/readout via the source and analytics APIs.
- Supports the **Section 6** non-functional bars: secrets stay server-side, integrations fail safely.

## What decision this informs
- Which auth mechanism, scopes, and endpoints to use per provider, and how to fail safely on auth errors.
- How to read baseline metrics and per-segment data back from GA4/Looker (feeds FR-B2 and FR-G2).
- How to inject and create an experiment without leaking secrets to the browser.

## Suggested layout (one subfolder per provider)
- `github/` — repo access, OAuth/PAT, file read/write for injection.
- `wordpress/` — REST API / app passwords (MVP may stub).
- `framer/` — publish/embed model (MVP may stub).
- `ga4/` — Data API, auth (service account / OAuth), metric + dimension definitions.
- `looker/` — API auth (MVP may stub).

## What to drop here
- **Links** to official API docs in `LINKS.md` (per provider, with the exact endpoints we rely on).
- **Auth notes** — `auth-notes.md` per provider: which credential type, scopes, where the secret lives (server-side only), token refresh.
- **Saved request/response samples** (`*.json`) showing real payload shapes.
- **Zips** of SDK examples or quickstart repos, dropped directly here.

## Conventions
- Links → `LINKS.md`. Samples → `.json`/`.zip` directly in the relevant provider subfolder.
- **Never commit real secrets.** Drop redacted samples and document where the live secret is configured (mirrors `api/propose-challenger.js` server-side pattern). Use placeholders like `<GITHUB_TOKEN>`.
