// scripts/smoke.mjs
//
// Browser smoke test for the Beagle MVP.
//
// What it does:
//   - Resolves a BASE_URL (env, default http://localhost:5173).
//   - If that URL is not already reachable, spawns `npm run dev` and waits for it.
//   - Launches headless Chromium (browser is pre-installed; never runs
//     `playwright install`, relies on PLAYWRIGHT_BROWSERS_PATH).
//   - Loads `/` and `/?walkthrough=1`, captures console + pageerror events,
//     asserts the hero / app shell renders, and screenshots each route.
//   - Prints a PASS/FAIL summary and exits non-zero on any failure.
//
// Usage:
//   npm run smoke                      # auto-starts dev server if needed
//   BASE_URL=http://localhost:5173 npm run smoke   # reuse a running server
//
// Idempotent: it only starts a dev server it can prove it owns, and always
// tears down the browser and any spawned server in a finally block.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE_URL = (process.env.BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const ARTIFACT_DIR = path.join(REPO_ROOT, "smoke-artifacts");

// Console error substrings we tolerate (noise that is not a real app failure).
// Network/static-asset failures (missing og-image, proxy-blocked web fonts) and
// dev-only chatter are not "the app failed to render" — real JS exceptions are
// caught via the `pageerror` listener regardless of this list.
const IGNORED_CONSOLE = [
  "favicon",
  "Download the React DevTools",
  "[vite] connected",
  "[vite] connecting",
  "Failed to load resource", // 404s for og-image and other static assets
  "ERR_CONNECTION_CLOSED", // proxy-blocked external fonts in sandboxed envs
  "net::ERR_", // any network-layer fetch failure (not an app crash)
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** True if the URL responds to a GET within `timeoutMs`. */
async function isReachable(url, timeoutMs = 2000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal });
    // Any HTTP response (even 404) means the server is up.
    return res.ok || res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** Poll until reachable or until the deadline. */
async function waitForServer(url, { timeoutMs = 60000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isReachable(url)) return true;
    await sleep(intervalMs);
  }
  return false;
}

/** Spawn `npm run dev`. Returns the child process (or null on failure). */
function startDevServer() {
  const port = (() => {
    try {
      return new URL(BASE_URL).port || "5173";
    } catch {
      return "5173";
    }
  })();

  // `detached: true` puts npm + its vite child in their own process group, so
  // teardown can signal the whole group (npm does not forward SIGTERM to vite).
  const child = spawn("npm", ["run", "dev", "--", "--port", port, "--strictPort"], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    detached: true,
  });

  child.stdout?.on("data", (d) => process.stdout.write(`[dev] ${d}`));
  child.stderr?.on("data", (d) => process.stderr.write(`[dev] ${d}`));
  return child;
}

/**
 * Best-effort kill of a spawned dev server *and* its child processes.
 * npm does not forward signals to its vite child, so we signal the whole
 * process group (negative PID) created by `detached: true`.
 */
async function stopDevServer(child) {
  if (!child || child.killed) return;

  const signalGroup = (sig) => {
    try {
      process.kill(-child.pid, sig); // negative pid => whole process group
    } catch {
      // Group gone or not permitted; fall back to the direct child.
      try {
        child.kill(sig);
      } catch {
        /* ignore */
      }
    }
  };

  signalGroup("SIGTERM");
  // Give it a moment; escalate if still alive.
  for (let i = 0; i < 15 && child.exitCode === null; i++) await sleep(200);
  if (child.exitCode === null) signalGroup("SIGKILL");
}

function isIgnoredConsole(text) {
  return IGNORED_CONSOLE.some((frag) => text.includes(frag));
}

// Tracks results so the summary can print per-check status.
const checks = [];
function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  const tag = ok ? "PASS" : "FAIL";
  console.log(`  [${tag}] ${name}${detail ? ` — ${detail}` : ""}`);
}

/**
 * Open a route, wire up error listeners, run a per-route assertion, and
 * screenshot. Returns the list of severe errors collected for that route.
 */
async function checkRoute(browser, route, label, assertFn) {
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!isIgnoredConsole(text)) consoleErrors.push(text);
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err?.message || String(err));
  });

  const url = `${BASE_URL}${route}`;
  try {
    // `domcontentloaded` (not `networkidle`): Vite keeps an HMR websocket open
    // and the app runs animation loops, so the network never goes idle. We wait
    // on concrete DOM signals in the per-route assertion instead.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  } catch (err) {
    record(`${label}: navigation`, false, `goto failed: ${err?.message || err}`);
  }

  // Per-route render assertion.
  try {
    await assertFn(page);
  } catch (err) {
    record(`${label}: render assertion`, false, err?.message || String(err));
  }

  // Screenshot regardless of pass/fail (failures are the useful ones).
  const file = path.join(ARTIFACT_DIR, `${label.replace(/[^a-z0-9]+/gi, "-")}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  [info] screenshot -> ${file}`);
  } catch (err) {
    console.log(`  [warn] screenshot failed: ${err?.message || err}`);
  }

  const severe = [...pageErrors, ...consoleErrors];
  record(
    `${label}: no severe console/page errors`,
    severe.length === 0,
    severe.length ? severe.slice(0, 3).join(" | ") : ""
  );

  await page.close();
  return severe;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Beagle smoke test — target ${BASE_URL}`);
  await mkdir(ARTIFACT_DIR, { recursive: true });

  let devServer = null;
  let browser = null;

  try {
    // 1. Ensure a server is up.
    if (await isReachable(BASE_URL)) {
      console.log("Dev server already reachable; reusing it.");
    } else {
      console.log("No server at target; starting `npm run dev`...");
      devServer = startDevServer();
      const up = await waitForServer(BASE_URL, { timeoutMs: 60000 });
      if (!up) {
        record("dev server boot", false, "did not become reachable in 60s");
        throw new Error("dev server failed to start");
      }
      record("dev server boot", true);
    }

    // 2. Launch Chromium (browser pre-installed; do NOT install here).
    browser = await chromium.launch({ headless: true });

    // 3. Route checks.
    console.log("\nRoute: / (landing hero)");
    await checkRoute(browser, "/", "landing", async (page) => {
      // Hero renders: a visible <h1> (Hero.jsx) or a hero landmark.
      const h1 = page.locator("h1").first();
      await h1.waitFor({ state: "visible", timeout: 15000 });
      const text = (await h1.textContent())?.trim() || "";
      if (!text) throw new Error("h1 present but empty");
      record("landing: hero <h1> visible", true, text.slice(0, 60));
    });

    console.log("\nRoute: /?walkthrough=1 (app shell)");
    await checkRoute(browser, "/?walkthrough=1", "walkthrough", async (page) => {
      // The walkthrough param loads the populated demo (app shell).
      // Assert the React root mounted real content rather than an empty shell.
      const root = page.locator("#root");
      await root.waitFor({ state: "attached", timeout: 15000 });
      await page.waitForFunction(
        () => {
          const el = document.querySelector("#root");
          return !!el && el.children.length > 0 && el.innerText.trim().length > 0;
        },
        { timeout: 15000 }
      );
      const ok = await page.evaluate(() => {
        const el = document.querySelector("#root");
        return !!el && el.innerText.trim().length > 0;
      });
      if (!ok) throw new Error("#root mounted no visible content");
      record("walkthrough: app shell mounted", true);
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
    await stopDevServer(devServer);
  }

  // 4. Summary.
  const failed = checks.filter((c) => !c.ok);
  console.log("\n──────────────────────────────────────────");
  console.log(`SMOKE SUMMARY: ${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length) {
    console.log("FAILED CHECKS:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    console.log("RESULT: FAIL");
    process.exitCode = 1;
  } else {
    console.log("RESULT: PASS");
    process.exitCode = 0;
  }
  console.log(`Artifacts: ${ARTIFACT_DIR}`);
}

main().catch((err) => {
  console.error("\nSMOKE CRASHED:", err?.stack || err);
  process.exitCode = 1;
});
