-- ===========================================================================
-- Beagle MVP — initial Supabase schema (0001_init)
-- ===========================================================================
-- Persistence layer for the real Beagle loop. Grounded in the in-memory store
-- shapes this replaces:
--   - source_connections  <- src/lib/sources/store.js + api/_lib/source.js
--                            (buildSourceReference: secret-free reference)
--   - guardrails          <- src/lib/guardrails/store.js (legal/style/immutable)
--   - experiments         <- src/hooks/useExperiment.js + src/lib/approval.js
--   - variant_assignments <- FR-D2 cookie assignment + FR-H3 segment serving
--   - results             <- FR-D3/FR-G readout (per-variant / per-segment stats)
--   - token_spend         <- FR-E1 token ledger (src/lib/tokens.js)
--
-- SECRET HANDLING (Section 6 — NON-NEGOTIABLE):
--   No table here stores a secret in plaintext. GitHub tokens, GA4 / Looker
--   credentials, and any API key NEVER live in these columns. The connected
--   reference is secret-free (owner/repo/ref/located-page only). When a real
--   token must be persisted for re-fetching, store it in Supabase Vault
--   (vault.create_secret / vault.decrypted_secrets) or an external encrypted
--   secret store and keep ONLY the opaque secret id/name in
--   source_connections.secret_ref. This migration leaves that SEAM (the
--   secret_ref column) but deliberately does NOT create a plaintext token
--   column. Do not add one.
--
-- RLS: enabled on every table. The server-side service_role key (used ONLY by
--   api/ routes — never the browser) BYPASSES RLS, so all api/ writes work
--   regardless of the policies below. The anon/authenticated policies are a
--   conservative baseline for a future client-direct read path; tighten them to
--   real per-user ownership (auth.uid()) when auth lands.
-- ===========================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- projects — top-level container; everything is scoped to a project.
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- source_connections — FR-A1d: the secret-free reference to the connected
-- source + located page. Mirrors buildSourceReference() exactly.
-- ---------------------------------------------------------------------------
create table if not exists public.source_connections (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  kind          text not null,            -- 'github' | 'wordpress' | 'framer'
  repo_owner    text,                     -- repo.owner   (github)
  repo_name     text,                     -- repo.name    (github)
  ref           text,                     -- branch / ref ('HEAD' default)
  located_page  jsonb,                    -- { path, reason, score } or null
  locator       text,                     -- stable human handle (no secret)
  -- SEAM ONLY (see header): opaque pointer into Supabase Vault / external
  -- secret store for the GitHub token. NEVER the token itself. Nullable; the
  -- MVP never populates it (the token stays server-side in process.env).
  secret_ref    text,
  connected_at  timestamptz not null default now()
);
create index if not exists source_connections_project_idx
  on public.source_connections (project_id);

-- ---------------------------------------------------------------------------
-- guardrails — FR-F1/F2/F3 persistence. One row per project (latest wins).
-- Mirrors the guardrails store model: legalLimits.doc, styleGuide.doc,
-- immutables (parsed). We persist the RAW docs (re-parsed on load by
-- parseLegalLimits / parseImmutables) plus the parsed immutables for fast read.
-- ---------------------------------------------------------------------------
create table if not exists public.guardrails (
  project_id    uuid primary key references public.projects(id) on delete cascade,
  legal_limits  text not null default '',  -- legalLimits.doc (raw)
  style_guide   text not null default '',  -- styleGuide.doc  (raw)
  immutables    jsonb not null default '[]'::jsonb, -- parsed immutables model
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- experiments — FR-D3: an approved experiment tied to a variant pair + metric.
-- champion_config / challenger_config are hero configs (engine design space).
-- verdict holds the FR-G1 hypothesisVerdict() result once results are read.
-- ---------------------------------------------------------------------------
create table if not exists public.experiments (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects(id) on delete cascade,
  metric             text not null,        -- 'ctr' | 'conversion' | 'timeToAction'
  hypothesis         text,                 -- one-paragraph hypothesis (FR-C1)
  champion_config    jsonb not null,       -- approved champion hero config
  challenger_config  jsonb not null,       -- approved challenger hero config
  status             text not null default 'live', -- 'live'|'paused'|'decided'
  verdict            jsonb,                -- hypothesisVerdict() result (or null)
  created_at         timestamptz not null default now()
);
create index if not exists experiments_project_idx
  on public.experiments (project_id);

-- ---------------------------------------------------------------------------
-- variant_assignments — FR-D2 cookie assignment + FR-H3 segment serving.
-- A visitor (cookie id) is assigned to a variant ONCE per experiment and the
-- assignment is sticky. The unique index enforces stickiness at the DB level.
-- ---------------------------------------------------------------------------
create table if not exists public.variant_assignments (
  id             uuid primary key default gen_random_uuid(),
  experiment_id  uuid not null references public.experiments(id) on delete cascade,
  visitor_id     text not null,            -- opaque cookie id (no PII)
  segment        text,                     -- FR-H3 segment (nullable = aggregate)
  variant        text not null,            -- 'champion' | 'challenger'
  assigned_at    timestamptz not null default now()
);
-- Stickiness: one assignment per (experiment, visitor). Re-injection reads this
-- row back instead of re-rolling, so assignment is stable across visits.
create unique index if not exists variant_assignments_unique
  on public.variant_assignments (experiment_id, visitor_id);

-- ---------------------------------------------------------------------------
-- results — FR-D3 / FR-G readout. Per-variant (and optionally per-segment)
-- measured metric values pulled back from analytics (GA4). value/n feed the
-- existing analysis.js stats shape — NEVER fabricated (Section 6).
-- ---------------------------------------------------------------------------
create table if not exists public.results (
  id             uuid primary key default gen_random_uuid(),
  experiment_id  uuid not null references public.experiments(id) on delete cascade,
  variant        text not null,            -- 'champion' | 'challenger'
  segment        text,                     -- nullable = aggregate
  metric         text not null,            -- metric id this value is for
  value          numeric,                  -- measured metric value (nullable=no data)
  n              integer,                  -- sample size (visitors)
  recorded_at    timestamptz not null default now()
);
create index if not exists results_experiment_idx
  on public.results (experiment_id);
-- One latest row per (experiment, variant, segment, metric) read; upserts
-- overwrite rather than accumulate duplicates.
create unique index if not exists results_unique
  on public.results (experiment_id, variant, coalesce(segment, ''), metric);

-- ---------------------------------------------------------------------------
-- token_spend — FR-E1. One row per Claude call, attributable to an experiment.
-- Mirrors the proposal/report extractUsage() shape (input/output/total tokens).
-- ---------------------------------------------------------------------------
create table if not exists public.token_spend (
  id             uuid primary key default gen_random_uuid(),
  experiment_id  uuid references public.experiments(id) on delete set null,
  route          text,                     -- 'propose-challenger'|'check-page'|'generate-report'
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  total_tokens   integer not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists token_spend_experiment_idx
  on public.token_spend (experiment_id);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
-- service_role (used only by api/ serverless code) bypasses RLS entirely, so
-- the policies below do NOT affect server-side writes. They are a conservative
-- baseline for any future client-direct (anon/authenticated) access. Today the
-- browser never talks to these tables directly, so read access stays closed.
alter table public.projects            enable row level security;
alter table public.source_connections  enable row level security;
alter table public.guardrails          enable row level security;
alter table public.experiments         enable row level security;
alter table public.variant_assignments enable row level security;
alter table public.results             enable row level security;
alter table public.token_spend         enable row level security;

-- Baseline: deny-by-default for anon/authenticated. We create explicit policies
-- (rather than leaving zero policies) so the intent is documented; broaden to
-- auth.uid()-scoped ownership when real auth is added.
do $$
declare t text;
begin
  foreach t in array array[
    'projects','source_connections','guardrails','experiments',
    'variant_assignments','results','token_spend'
  ]
  loop
    -- Read policy: closed for now (no anon reads). Flip the USING clause to a
    -- real ownership check (e.g. project membership) when auth lands.
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (false);',
      t || '_select_closed', t
    );
    -- No insert/update/delete policies for anon/authenticated: writes are
    -- server-side only via service_role (which bypasses RLS).
  end loop;
end $$;
