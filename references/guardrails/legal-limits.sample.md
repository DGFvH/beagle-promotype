# Legal limits — SAMPLE (do not ship as real policy)

> **This is a sample fixture** used by the guardrails module and its tests
> (`src/lib/guardrails/`). It demonstrates the machine-readable scheme the parser
> understands. Replace with a real, legal-reviewed document per project.

## How this document is parsed

The guardrails parser (`parseLegalLimits` in `src/lib/guardrails/legal.js`) reads
a free-text legal-limits doc and extracts **deterministic, enforceable rules**
from explicit markers. Everything outside a marker is treated as human context
and is NOT auto-enforced (a model-backed interpretation of free prose is a
deferred, server-side step — see `TODO(server-side legal interpretation)` in the
module). The supported markers are:

- `FORBIDDEN: <term or phrase>` — proposed hero copy must not contain this
  term/phrase (case-insensitive, word-boundary aware). One per line.
- `FORBIDDEN_REGEX: <pattern>` — same, but the value is a JavaScript regex
  (matched case-insensitively). Use for claim patterns.

Lines without a marker are ignored by the enforcement engine.

## Forbidden claims (enforced)

We must not make unsubstantiated superlative or guarantee claims:

FORBIDDEN: guaranteed
FORBIDDEN: guarantee
FORBIDDEN: 100% conversion
FORBIDDEN: risk-free
FORBIDDEN: best in the world
FORBIDDEN: number one

We must not promise specific unverified outcomes:

FORBIDDEN_REGEX: \b\d{2,}%\s+(more|increase|boost|conversion)\b
FORBIDDEN_REGEX: \bdouble your (sales|revenue|conversions?)\b

## Human context (not auto-enforced)

The legal team requires that any comparative claim against a named competitor be
reviewed manually before launch. The parser does not enforce this; it is surfaced
to reviewers in the UI. (Deferred to a model-backed review step, server-side.)
