// ===========================================================================
// Persistence repositories + factory (FR-D2/D3, FR-B, FR-E1, FR-F)
// ===========================================================================
// A single async repository interface over the MVP's persistence needs, with
// TWO interchangeable implementations:
//
//   - In-memory (default): reuses the existing in-memory stores where they
//     exist (sources, guardrails) and a process-local Map for the entities that
//     had no store yet (experiments, assignments, results, token_spend). This
//     is what runs TODAY — nothing changes when Supabase env is absent.
//
//   - Supabase-backed: the same methods implemented over @supabase/supabase-js
//     using the SERVER service_role client. Rows are mapped to/from the same
//     shapes the in-memory store returns, so callers are implementation-blind.
//
// getRepositories() returns the Supabase repo when isSupabaseConfigured("server")
// is true, else the in-memory repo. NOTHING is rewired yet: existing callers
// still import the in-memory stores directly. Switching them over is a
// documented TODO for the local instance (see the report / TODOs at the bottom).
//
// The in-memory source/guardrail methods delegate to the canonical stores so we
// never fork their behaviour. We import them READ-ONLY (no edits to those files).

import {
  setConnectedSource,
  getConnectedSource,
  setPageCheck,
  getPageCheck,
  clearSource,
  DEFAULT_PROJECT,
} from "../sources/store.js";
import {
  provideGuardrails,
  loadGuardrails,
  clearGuardrails,
} from "../guardrails/store.js";
import { getServiceClient, isSupabaseConfigured } from "./supabaseClient.js";

// ---------------------------------------------------------------------------
// Row <-> shape mappers (Supabase). Centralised so the column contract lives in
// exactly one place and is unit-testable.
// ---------------------------------------------------------------------------

// source_connections row -> buildSourceReference() shape.
export function sourceRowToReference(row) {
  if (!row) return null;
  return {
    kind: row.kind,
    label: row.label ?? undefined,
    repo: { owner: row.repo_owner ?? null, name: row.repo_name ?? null },
    ref: row.ref ?? "HEAD",
    page: row.located_page ?? null,
    locator: row.locator ?? null,
    connectedAt: row.connected_at ? Date.parse(row.connected_at) : null,
  };
}

// buildSourceReference() shape -> source_connections insert columns (secret-free).
export function referenceToSourceRow(reference, projectId) {
  return {
    project_id: projectId,
    kind: reference.kind,
    repo_owner: reference.repo?.owner ?? null,
    repo_name: reference.repo?.name ?? null,
    ref: reference.ref ?? "HEAD",
    located_page: reference.page ?? null,
    locator: reference.locator ?? null,
    // secret_ref intentionally omitted — token stays server-side (Section 6).
  };
}

// experiments row -> experiment record shape.
export function experimentRowToRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    metric: row.metric,
    hypothesis: row.hypothesis ?? null,
    championConfig: row.champion_config ?? null,
    challengerConfig: row.challenger_config ?? null,
    status: row.status ?? "live",
    verdict: row.verdict ?? null,
    createdAt: row.created_at ? Date.parse(row.created_at) : null,
  };
}

export function resultRowToRecord(row) {
  if (!row) return null;
  return {
    experimentId: row.experiment_id,
    variant: row.variant,
    segment: row.segment ?? null,
    metric: row.metric,
    value: row.value == null ? null : Number(row.value),
    n: row.n == null ? null : Number(row.n),
    recordedAt: row.recorded_at ? Date.parse(row.recorded_at) : null,
  };
}

export function assignmentRowToRecord(row) {
  if (!row) return null;
  return {
    experimentId: row.experiment_id,
    visitorId: row.visitor_id,
    segment: row.segment ?? null,
    variant: row.variant,
    assignedAt: row.assigned_at ? Date.parse(row.assigned_at) : null,
  };
}

// ===========================================================================
// In-memory repository (default; reuses canonical stores)
// ===========================================================================
function createInMemoryRepositories() {
  // Local maps for entities that had no in-memory store before this layer.
  const experiments = new Map(); // id -> record
  const assignments = new Map(); // `${experimentId}:${visitorId}` -> record
  const results = new Map(); // `${experimentId}:${variant}:${segment}:${metric}` -> record
  const tokenSpend = []; // append-only

  let _seq = 0;
  const nextId = (p) => `${p}_${Date.now()}_${++_seq}`;

  return {
    backend: "memory",

    sources: {
      async save(reference, projectId = DEFAULT_PROJECT) {
        return setConnectedSource(reference, projectId);
      },
      async get(projectId = DEFAULT_PROJECT) {
        return getConnectedSource(projectId);
      },
      async savePageCheck(verdict, projectId = DEFAULT_PROJECT) {
        return setPageCheck(verdict, projectId);
      },
      async getPageCheck(projectId = DEFAULT_PROJECT) {
        return getPageCheck(projectId);
      },
      async clear(projectId = DEFAULT_PROJECT) {
        return clearSource(projectId);
      },
    },

    guardrails: {
      async save(input) {
        return provideGuardrails(input);
      },
      async load(projectId = DEFAULT_PROJECT) {
        return loadGuardrails(projectId);
      },
      async clear(projectId = DEFAULT_PROJECT) {
        return clearGuardrails(projectId);
      },
    },

    experiments: {
      async create(record) {
        const id = record.id ?? nextId("exp");
        const stored = { ...record, id, createdAt: record.createdAt ?? Date.now() };
        experiments.set(id, stored);
        return stored;
      },
      async get(id) {
        return experiments.get(id) ?? null;
      },
      async listByProject(projectId) {
        return [...experiments.values()].filter((e) => e.projectId === projectId);
      },
      async setVerdict(id, verdict, status) {
        const cur = experiments.get(id);
        if (!cur) return null;
        const next = { ...cur, verdict, ...(status ? { status } : {}) };
        experiments.set(id, next);
        return next;
      },
    },

    assignments: {
      // FR-D2 sticky assignment: assign ONCE per (experiment, visitor). If a
      // row exists, return it (stable across visits) instead of re-rolling.
      async assign({ experimentId, visitorId, variant, segment = null, at = Date.now() }) {
        const key = `${experimentId}:${visitorId}`;
        const existing = assignments.get(key);
        if (existing) return existing;
        const record = { experimentId, visitorId, segment, variant, assignedAt: at };
        assignments.set(key, record);
        return record;
      },
      async get({ experimentId, visitorId }) {
        return assignments.get(`${experimentId}:${visitorId}`) ?? null;
      },
    },

    results: {
      // Upsert by (experiment, variant, segment, metric) — latest read wins.
      async upsert(record) {
        const seg = record.segment ?? "";
        const key = `${record.experimentId}:${record.variant}:${seg}:${record.metric}`;
        const stored = { ...record, recordedAt: record.recordedAt ?? Date.now() };
        results.set(key, stored);
        return stored;
      },
      async listByExperiment(experimentId) {
        return [...results.values()].filter((r) => r.experimentId === experimentId);
      },
    },

    tokenSpend: {
      // FR-E1: append one Claude call's usage. Non-blocking, never throws.
      async record({ experimentId = null, route = null, usage = {}, at = Date.now() }) {
        const u = usage ?? {};
        const entry = {
          experimentId,
          route,
          input_tokens: num(u.input_tokens ?? u.input),
          output_tokens: num(u.output_tokens ?? u.output),
          total_tokens: num(u.total_tokens ?? u.total),
          createdAt: at,
        };
        if (!entry.total_tokens) entry.total_tokens = entry.input_tokens + entry.output_tokens;
        tokenSpend.push(entry);
        return entry;
      },
      async listByExperiment(experimentId) {
        return tokenSpend.filter((t) => t.experimentId === experimentId);
      },
    },

    // Test/reset helper (parity with the stores' clear()).
    async __reset() {
      experiments.clear();
      assignments.clear();
      results.clear();
      tokenSpend.length = 0;
      clearSource(undefined);
      clearGuardrails(undefined);
    },
  };
}

// ===========================================================================
// Supabase-backed repository (server-side; service_role bypasses RLS)
// ===========================================================================
function createSupabaseRepositories(client) {
  const throwOn = (error, what) => {
    if (error) throw new Error(`supabase ${what} failed: ${error.message}`);
  };

  return {
    backend: "supabase",

    sources: {
      async save(reference, projectId) {
        const row = referenceToSourceRow(reference, projectId);
        const { data, error } = await client
          .from("source_connections")
          .insert(row)
          .select()
          .single();
        throwOn(error, "source_connections.insert");
        return sourceRowToReference(data);
      },
      async get(projectId) {
        const { data, error } = await client
          .from("source_connections")
          .select("*")
          .eq("project_id", projectId)
          .order("connected_at", { ascending: false })
          .limit(1);
        throwOn(error, "source_connections.select");
        return sourceRowToReference(data?.[0]);
      },
      async savePageCheck(verdict, experimentOrProject) {
        // Page-check verdict has no dedicated table in 0001; persist alongside
        // the located page is a future migration. For now this is a no-op write
        // that returns the verdict so callers behave identically.
        // TODO(local): add a page_checks table or a located_page.check column.
        return verdict ?? null;
      },
      async getPageCheck() {
        // See savePageCheck TODO.
        return null;
      },
    },

    guardrails: {
      async save({ projectId, legalLimitsDoc = "", styleGuideDoc = "", immutables = [] }) {
        // Persist the parsed model so a reload returns the same store shape.
        // We import the parsers lazily to avoid a hard dep cycle.
        const { parseLegalLimits } = await import("../guardrails/legal.js");
        const { parseImmutables } = await import("../guardrails/immutables.js");
        const parsedImmutables =
          typeof immutables === "string" ? safeJson(immutables) : immutables;
        const row = {
          project_id: projectId,
          legal_limits: legalLimitsDoc,
          style_guide: styleGuideDoc,
          immutables: parseImmutables(parsedImmutables),
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await client
          .from("guardrails")
          .upsert(row, { onConflict: "project_id" })
          .select()
          .single();
        throwOn(error, "guardrails.upsert");
        return {
          legalLimits: { doc: data.legal_limits, parsed: parseLegalLimits(data.legal_limits) },
          styleGuide: { doc: data.style_guide },
          immutables: data.immutables,
        };
      },
      async load(projectId) {
        const { parseLegalLimits } = await import("../guardrails/legal.js");
        const { parseImmutables } = await import("../guardrails/immutables.js");
        const { data, error } = await client
          .from("guardrails")
          .select("*")
          .eq("project_id", projectId)
          .maybeSingle();
        throwOn(error, "guardrails.select");
        if (!data) {
          return {
            legalLimits: { doc: "", parsed: parseLegalLimits("") },
            styleGuide: { doc: "" },
            immutables: parseImmutables([]),
          };
        }
        return {
          legalLimits: { doc: data.legal_limits, parsed: parseLegalLimits(data.legal_limits) },
          styleGuide: { doc: data.style_guide },
          immutables: data.immutables,
        };
      },
    },

    experiments: {
      async create(record) {
        const row = {
          project_id: record.projectId,
          metric: record.metric,
          hypothesis: record.hypothesis ?? null,
          champion_config: record.championConfig,
          challenger_config: record.challengerConfig,
          status: record.status ?? "live",
          verdict: record.verdict ?? null,
        };
        const { data, error } = await client
          .from("experiments")
          .insert(row)
          .select()
          .single();
        throwOn(error, "experiments.insert");
        return experimentRowToRecord(data);
      },
      async get(id) {
        const { data, error } = await client
          .from("experiments")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        throwOn(error, "experiments.select");
        return experimentRowToRecord(data);
      },
      async listByProject(projectId) {
        const { data, error } = await client
          .from("experiments")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        throwOn(error, "experiments.list");
        return (data ?? []).map(experimentRowToRecord);
      },
      async setVerdict(id, verdict, status) {
        const patch = { verdict };
        if (status) patch.status = status;
        const { data, error } = await client
          .from("experiments")
          .update(patch)
          .eq("id", id)
          .select()
          .single();
        throwOn(error, "experiments.update");
        return experimentRowToRecord(data);
      },
    },

    assignments: {
      async assign({ experimentId, visitorId, variant, segment = null }) {
        // Sticky: ignoreDuplicates so a second injection keeps the first roll.
        const { error: insErr } = await client
          .from("variant_assignments")
          .upsert(
            { experiment_id: experimentId, visitor_id: visitorId, variant, segment },
            { onConflict: "experiment_id,visitor_id", ignoreDuplicates: true }
          );
        throwOn(insErr, "variant_assignments.upsert");
        // Read back the authoritative row (the original on a duplicate).
        return this.get({ experimentId, visitorId });
      },
      async get({ experimentId, visitorId }) {
        const { data, error } = await client
          .from("variant_assignments")
          .select("*")
          .eq("experiment_id", experimentId)
          .eq("visitor_id", visitorId)
          .maybeSingle();
        throwOn(error, "variant_assignments.select");
        return assignmentRowToRecord(data);
      },
    },

    results: {
      async upsert(record) {
        const row = {
          experiment_id: record.experimentId,
          variant: record.variant,
          segment: record.segment ?? null,
          metric: record.metric,
          value: record.value ?? null,
          n: record.n ?? null,
          recorded_at: new Date().toISOString(),
        };
        const { data, error } = await client
          .from("results")
          .upsert(row, { onConflict: "experiment_id,variant,segment,metric" })
          .select()
          .single();
        throwOn(error, "results.upsert");
        return resultRowToRecord(data);
      },
      async listByExperiment(experimentId) {
        const { data, error } = await client
          .from("results")
          .select("*")
          .eq("experiment_id", experimentId);
        throwOn(error, "results.list");
        return (data ?? []).map(resultRowToRecord);
      },
    },

    tokenSpend: {
      async record({ experimentId = null, route = null, usage = {} }) {
        const u = usage ?? {};
        const input = num(u.input_tokens ?? u.input);
        const output = num(u.output_tokens ?? u.output);
        let total = num(u.total_tokens ?? u.total);
        if (!total) total = input + output;
        const { data, error } = await client
          .from("token_spend")
          .insert({
            experiment_id: experimentId,
            route,
            input_tokens: input,
            output_tokens: output,
            total_tokens: total,
          })
          .select()
          .single();
        throwOn(error, "token_spend.insert");
        return {
          experimentId: data.experiment_id,
          route: data.route,
          input_tokens: data.input_tokens,
          output_tokens: data.output_tokens,
          total_tokens: data.total_tokens,
          createdAt: data.created_at ? Date.parse(data.created_at) : null,
        };
      },
      async listByExperiment(experimentId) {
        const { data, error } = await client
          .from("token_spend")
          .select("*")
          .eq("experiment_id", experimentId);
        throwOn(error, "token_spend.list");
        return (data ?? []).map((row) => ({
          experimentId: row.experiment_id,
          route: row.route,
          input_tokens: row.input_tokens,
          output_tokens: row.output_tokens,
          total_tokens: row.total_tokens,
          createdAt: row.created_at ? Date.parse(row.created_at) : null,
        }));
      },
    },
  };
}

// ===========================================================================
// Factory
// ===========================================================================
// Returns the Supabase repo when the server env is configured, else the
// in-memory repo. Async because constructing the Supabase client is async
// (lazy SDK import). Caches per process.
//
// NOTE: an explicit `client` can be injected (tests pass a mock supabase-js
// client) to exercise the Supabase repo without a live DB or env.
let _cached = null;

export async function getRepositories({ client = undefined, force = false } = {}) {
  if (client) return createSupabaseRepositories(client);
  if (_cached && !force) return _cached;
  if (isSupabaseConfigured("server")) {
    const sb = await getServiceClient();
    _cached = sb ? createSupabaseRepositories(sb) : createInMemoryRepositories();
  } else {
    _cached = createInMemoryRepositories();
  }
  return _cached;
}

// Test seam: drop the cached repo so the next getRepositories re-reads env.
export function __resetRepositoriesForTests() {
  _cached = null;
}

// Exposed for tests that want the in-memory impl directly.
export { createInMemoryRepositories, createSupabaseRepositories };

// --- helpers ---------------------------------------------------------------
function num(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}
function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}
