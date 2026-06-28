// ===========================================================================
// Supabase client factory (Section 6 — secrets stay server-side)
// ===========================================================================
// Two distinct clients, never mixed:
//
//   SERVER  (api/ routes ONLY): SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
//           The service_role key BYPASSES RLS and must NEVER reach the browser.
//           getServiceClient() reads process.env and is only imported by api/
//           serverless code. It is not referenced by any client bundle entry.
//
//   CLIENT  (future client-direct reads): SUPABASE_URL + SUPABASE_ANON_KEY.
//           The anon key is RLS-gated and safe to ship. Not used today (the
//           browser talks to api/ routes), but the seam exists.
//
// isSupabaseConfigured() is the switch the repository factory uses: when the
// needed env vars are absent we fall back to the existing in-memory stores, so
// NOTHING changes in this environment (no DB creds) — the MVP keeps working.
//
// This module imports @supabase/supabase-js lazily inside the factory functions
// so merely importing it (e.g. for isSupabaseConfigured in client code) never
// pulls the SDK or a key into a bundle that doesn't use it.

// --- env access -------------------------------------------------------------
// process.env in Node (api/ routes, Vitest). The browser never has the
// service-role key; reading process.env there simply yields undefined.
function env(name) {
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return process.env[name];
  }
  return undefined;
}

const SERVER_KEYS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const CLIENT_KEYS = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];

/**
 * True when the SERVER-side Supabase env (url + service_role key) is present.
 * This is the gate the api/ repository factory uses to decide Supabase vs the
 * in-memory store. With no DB creds (this environment) it returns false and
 * everything falls back — no behaviour change.
 *
 * @param {"server"|"client"} [target="server"]
 */
export function isSupabaseConfigured(target = "server") {
  const keys = target === "client" ? CLIENT_KEYS : SERVER_KEYS;
  return keys.every((k) => Boolean(env(k)));
}

let _serviceClient = null;

/**
 * SERVER-ONLY Supabase client (service_role, bypasses RLS). Import ONLY from
 * api/ code. Returns null when unconfigured so callers can fall back instead of
 * crashing (mirrors the 501 not_configured pattern). Cached per process.
 */
export async function getServiceClient() {
  if (!isSupabaseConfigured("server")) return null;
  if (_serviceClient) return _serviceClient;
  const { createClient } = await import("@supabase/supabase-js");
  _serviceClient = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _serviceClient;
}

let _anonClient = null;

/**
 * Client-path Supabase client (anon key, RLS-gated). Safe for the browser.
 * Returns null when unconfigured. Not used in the MVP (browser -> api/ routes),
 * but kept as the documented seam for future client-direct reads.
 */
export async function getAnonClient() {
  if (!isSupabaseConfigured("client")) return null;
  if (_anonClient) return _anonClient;
  const { createClient } = await import("@supabase/supabase-js");
  _anonClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"));
  return _anonClient;
}

// Test seam: reset cached clients so unit tests can re-evaluate env.
export function __resetClientsForTests() {
  _serviceClient = null;
  _anonClient = null;
}
