// Tests for the Supabase persistence layer (src/lib/db/*). No live DB:
// @supabase/supabase-js is mocked. Covers the `auto`-relevant data-layer logic:
//   - isSupabaseConfigured reflects env
//   - factory returns in-memory when env unset, Supabase repo when a client is given
//   - in-memory repo CRUD maps to the store shapes; FR-D2 assignment is sticky
//   - Supabase repo CRUD hits the expected table/columns and maps rows back
//   - row<->shape mappers are pure and correct

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getRepositories,
  createInMemoryRepositories,
  createSupabaseRepositories,
  __resetRepositoriesForTests,
  sourceRowToReference,
  referenceToSourceRow,
  experimentRowToRecord,
  resultRowToRecord,
  assignmentRowToRecord,
} from "../db/repositories.js";
import { isSupabaseConfigured, __resetClientsForTests } from "../db/supabaseClient.js";

// ---------------------------------------------------------------------------
// A tiny mock supabase-js client that records the calls it receives and returns
// canned rows. Each from(table) returns a chainable query builder; terminal
// methods (.single/.maybeSingle/.then via await) resolve to { data, error }.
// ---------------------------------------------------------------------------
function makeMockClient() {
  const calls = [];
  function builder(table, op) {
    const state = { table, op, filters: {}, payload: undefined, opts: undefined };
    calls.push(state);
    const chain = {
      insert(payload) {
        state.op = "insert";
        state.payload = payload;
        return chain;
      },
      upsert(payload, opts) {
        state.op = "upsert";
        state.payload = payload;
        state.opts = opts;
        return chain;
      },
      update(payload) {
        state.op = "update";
        state.payload = payload;
        return chain;
      },
      select() {
        return chain;
      },
      eq(col, val) {
        state.filters[col] = val;
        return chain;
      },
      order() {
        return chain;
      },
      limit() {
        return chain;
      },
      maybeSingle() {
        return Promise.resolve(client.__resolve(state));
      },
      single() {
        return Promise.resolve(client.__resolve(state));
      },
      then(resolve, reject) {
        return Promise.resolve(client.__resolveList(state)).then(resolve, reject);
      },
    };
    return chain;
  }
  const client = {
    calls,
    __rows: {}, // per-table canned single-row result
    __lists: {}, // per-table canned list result
    __resolve(state) {
      return { data: client.__rows[state.table] ?? null, error: null };
    },
    __resolveList(state) {
      return { data: client.__lists[state.table] ?? [], error: null };
    },
    from(table) {
      return builder(table, "select");
    },
  };
  return client;
}

beforeEach(() => {
  __resetRepositoriesForTests();
  __resetClientsForTests();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
});
afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
});

describe("isSupabaseConfigured", () => {
  it("is false when no env vars are set", () => {
    expect(isSupabaseConfigured("server")).toBe(false);
    expect(isSupabaseConfigured("client")).toBe(false);
  });

  it("server is true only with URL + service role key", () => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    expect(isSupabaseConfigured("server")).toBe(false);
    process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
    expect(isSupabaseConfigured("server")).toBe(true);
  });

  it("client is true only with URL + anon key", () => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon";
    expect(isSupabaseConfigured("client")).toBe(true);
    expect(isSupabaseConfigured("server")).toBe(false);
  });
});

describe("factory selection", () => {
  it("returns the in-memory repo when env is unset", async () => {
    const repo = await getRepositories();
    expect(repo.backend).toBe("memory");
  });

  it("returns a Supabase repo when an explicit client is injected", async () => {
    const repo = await getRepositories({ client: makeMockClient() });
    expect(repo.backend).toBe("supabase");
  });
});

describe("row <-> shape mappers", () => {
  it("sourceRowToReference maps secret-free columns", () => {
    const ref = sourceRowToReference({
      kind: "github",
      repo_owner: "acme",
      repo_name: "site",
      ref: "main",
      located_page: { path: "src/Hero.jsx", reason: "hero", score: 9 },
      locator: "github:acme/site:src/Hero.jsx",
      connected_at: "2026-01-01T00:00:00Z",
    });
    expect(ref).toMatchObject({
      kind: "github",
      repo: { owner: "acme", name: "site" },
      ref: "main",
      page: { path: "src/Hero.jsx" },
      locator: "github:acme/site:src/Hero.jsx",
    });
    expect(typeof ref.connectedAt).toBe("number");
  });

  it("referenceToSourceRow never emits a token/secret column", () => {
    const row = referenceToSourceRow(
      {
        kind: "github",
        repo: { owner: "acme", name: "site" },
        ref: "main",
        page: { path: "p" },
        locator: "loc",
      },
      "proj-1"
    );
    expect(row).toMatchObject({
      project_id: "proj-1",
      kind: "github",
      repo_owner: "acme",
      repo_name: "site",
    });
    expect(JSON.stringify(row)).not.toMatch(/token|secret|password/i);
  });

  it("experimentRowToRecord / resultRowToRecord / assignmentRowToRecord map columns", () => {
    expect(
      experimentRowToRecord({
        id: "e1",
        project_id: "p1",
        metric: "ctr",
        champion_config: { a: 1 },
        challenger_config: { a: 2 },
        status: "live",
      })
    ).toMatchObject({ id: "e1", projectId: "p1", metric: "ctr", status: "live" });

    expect(
      resultRowToRecord({ experiment_id: "e1", variant: "champion", metric: "ctr", value: "0.5", n: "100" })
    ).toMatchObject({ experimentId: "e1", variant: "champion", value: 0.5, n: 100 });

    expect(
      assignmentRowToRecord({ experiment_id: "e1", visitor_id: "v9", variant: "challenger", segment: "social" })
    ).toMatchObject({ experimentId: "e1", visitorId: "v9", variant: "challenger", segment: "social" });
  });
});

describe("in-memory repo CRUD + shapes", () => {
  let repo;
  beforeEach(async () => {
    repo = createInMemoryRepositories();
    await repo.__reset();
  });

  it("sources save/get round-trips the secret-free reference", async () => {
    const ref = { kind: "github", repo: { owner: "a", name: "b" }, locator: "x" };
    await repo.sources.save(ref, "p1");
    expect(await repo.sources.get("p1")).toMatchObject({ kind: "github" });
  });

  it("experiments create + setVerdict", async () => {
    const exp = await repo.experiments.create({
      projectId: "p1",
      metric: "ctr",
      championConfig: { x: 1 },
      challengerConfig: { x: 2 },
    });
    expect(exp.id).toBeTruthy();
    const updated = await repo.experiments.setVerdict(exp.id, { verdict: "confirmed" }, "decided");
    expect(updated.status).toBe("decided");
    expect(updated.verdict).toEqual({ verdict: "confirmed" });
    expect(await repo.experiments.listByProject("p1")).toHaveLength(1);
  });

  it("FR-D2: assignment is sticky per (experiment, visitor)", async () => {
    const first = await repo.assignments.assign({
      experimentId: "e1",
      visitorId: "v1",
      variant: "challenger",
    });
    const second = await repo.assignments.assign({
      experimentId: "e1",
      visitorId: "v1",
      variant: "champion", // would re-roll — must be ignored
    });
    expect(second.variant).toBe("challenger");
    expect(second).toEqual(first);
    expect(await repo.assignments.get({ experimentId: "e1", visitorId: "v1" })).toMatchObject({
      variant: "challenger",
    });
  });

  it("results upsert overwrites by (experiment, variant, segment, metric)", async () => {
    await repo.results.upsert({ experimentId: "e1", variant: "champion", segment: null, metric: "ctr", value: 0.1, n: 10 });
    await repo.results.upsert({ experimentId: "e1", variant: "champion", segment: null, metric: "ctr", value: 0.2, n: 20 });
    const rows = await repo.results.listByExperiment("e1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ value: 0.2, n: 20 });
  });

  it("FR-E1: token spend records and derives total", async () => {
    await repo.tokenSpend.record({
      experimentId: "e1",
      route: "propose-challenger",
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const rows = await repo.tokenSpend.listByExperiment("e1");
    expect(rows[0]).toMatchObject({ input_tokens: 100, output_tokens: 50, total_tokens: 150 });
  });
});

describe("Supabase repo CRUD hits expected tables/columns", () => {
  it("experiments.create inserts into experiments with mapped columns", async () => {
    const client = makeMockClient();
    client.__rows.experiments = {
      id: "e1",
      project_id: "p1",
      metric: "ctr",
      champion_config: { x: 1 },
      challenger_config: { x: 2 },
      status: "live",
    };
    const repo = createSupabaseRepositories(client);
    const rec = await repo.experiments.create({
      projectId: "p1",
      metric: "ctr",
      championConfig: { x: 1 },
      challengerConfig: { x: 2 },
    });
    expect(rec).toMatchObject({ id: "e1", projectId: "p1", metric: "ctr" });
    const insert = client.calls.find((c) => c.table === "experiments" && c.op === "insert");
    expect(insert).toBeTruthy();
    expect(insert.payload).toMatchObject({
      project_id: "p1",
      metric: "ctr",
      champion_config: { x: 1 },
      challenger_config: { x: 2 },
    });
  });

  it("assignments.assign upserts with stickiness onConflict + ignoreDuplicates", async () => {
    const client = makeMockClient();
    client.__rows.variant_assignments = {
      experiment_id: "e1",
      visitor_id: "v1",
      variant: "challenger",
      segment: null,
    };
    const repo = createSupabaseRepositories(client);
    const rec = await repo.assignments.assign({ experimentId: "e1", visitorId: "v1", variant: "challenger" });
    expect(rec).toMatchObject({ experimentId: "e1", visitorId: "v1", variant: "challenger" });
    const upsert = client.calls.find((c) => c.table === "variant_assignments" && c.op === "upsert");
    expect(upsert.opts).toMatchObject({ onConflict: "experiment_id,visitor_id", ignoreDuplicates: true });
  });

  it("results.upsert targets results onConflict the unique key", async () => {
    const client = makeMockClient();
    client.__rows.results = {
      experiment_id: "e1",
      variant: "champion",
      segment: null,
      metric: "ctr",
      value: "0.3",
      n: "30",
    };
    const repo = createSupabaseRepositories(client);
    const rec = await repo.results.upsert({
      experimentId: "e1",
      variant: "champion",
      metric: "ctr",
      value: 0.3,
      n: 30,
    });
    expect(rec).toMatchObject({ value: 0.3, n: 30 });
    const upsert = client.calls.find((c) => c.table === "results" && c.op === "upsert");
    expect(upsert.opts).toMatchObject({ onConflict: "experiment_id,variant,segment,metric" });
  });

  it("tokenSpend.record inserts into token_spend with token columns", async () => {
    const client = makeMockClient();
    client.__rows.token_spend = {
      experiment_id: "e1",
      route: "check-page",
      input_tokens: 10,
      output_tokens: 5,
      total_tokens: 15,
    };
    const repo = createSupabaseRepositories(client);
    const rec = await repo.tokenSpend.record({
      experimentId: "e1",
      route: "check-page",
      usage: { input_tokens: 10, output_tokens: 5 },
    });
    expect(rec).toMatchObject({ input_tokens: 10, output_tokens: 5, total_tokens: 15 });
    const insert = client.calls.find((c) => c.table === "token_spend" && c.op === "insert");
    expect(insert.payload).toMatchObject({ input_tokens: 10, output_tokens: 5, total_tokens: 15 });
  });

  it("sources.save inserts a secret-free row into source_connections", async () => {
    const client = makeMockClient();
    client.__rows.source_connections = {
      kind: "github",
      repo_owner: "acme",
      repo_name: "site",
      ref: "main",
      located_page: null,
      locator: "github:acme/site",
      connected_at: "2026-01-01T00:00:00Z",
    };
    const repo = createSupabaseRepositories(client);
    await repo.sources.save(
      { kind: "github", repo: { owner: "acme", name: "site" }, ref: "main", locator: "github:acme/site" },
      "p1"
    );
    const insert = client.calls.find((c) => c.table === "source_connections" && c.op === "insert");
    expect(insert.payload).not.toHaveProperty("secret_ref");
    expect(JSON.stringify(insert.payload)).not.toMatch(/token|secret|password/i);
  });
});

describe("@supabase/supabase-js is importable but not pulled into client without env", () => {
  it("getServiceClient returns null when unconfigured (no crash)", async () => {
    const { getServiceClient } = await import("../db/supabaseClient.js");
    expect(await getServiceClient()).toBeNull();
  });
});
