import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Local `api/` dev runtime (generic, shared infra for all api/ routes)
// ---------------------------------------------------------------------------
// Production runs the functions under `api/` on Vercel. Under `npm run dev`,
// plain Vite has no serverless layer, so `/api/*` 404s and the client silently
// falls back to the local stub. This middleware mounts each `api/<name>.js`
// default export at `/api/<name>` with a minimal Vercel-compatible req/res shim
// so the real route (e.g. the Claude proposal) is exercisable locally.
//
// It loads `.env` (via Vite's loadEnv) into process.env so a local
// ANTHROPIC_API_KEY is picked up by the handler. It does NOT change the
// production/Vercel path — there the platform provides the runtime. Adding a new
// `api/<route>.js` needs no change here.
function localApiRoutes(env) {
  // Surface the loaded env to the handlers (server-side only; never bundled).
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  return {
    name: "local-api-routes",
    apply: "serve",
    configureServer(server) {
      const apiDir = resolve(__dirname, "api");

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();

        const path = req.url.split("?")[0];
        const name = path.slice("/api/".length).replace(/\/+$/, "");
        // Only top-level routes; ignore the _lib/ shared-code folder and nesting.
        if (!name || name.includes("/") || name.startsWith("_")) return next();

        let mod;
        try {
          // Fresh import each request so edits to the handler hot-apply in dev.
          const fileUrl = pathToFileURL(resolve(apiDir, `${name}.js`)).href;
          mod = await import(`${fileUrl}?t=${Date.now()}`);
        } catch {
          return next(); // no such route -> let Vite handle (404)
        }
        const fn = mod?.default;
        if (typeof fn !== "function") return next();

        try {
          const body = await readJsonBody(req);
          const shim = makeResShim(res);
          await fn({ method: req.method, body, headers: req.headers }, shim);
        } catch (err) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "dev_handler_failed", detail: String(err?.message ?? err) }));
          }
        }
      });
    },
  };
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
      return resolve(undefined);
    }
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) req.destroy(); // basic guard
    });
    req.on("end", () => {
      if (!data) return resolve(undefined);
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(data); // hand the raw string to the handler (it re-parses)
      }
    });
    req.on("error", () => resolve(undefined));
  });
}

// Minimal Vercel-compatible response shim over a Node http.ServerResponse.
function makeResShim(res) {
  const shim = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      res.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      res.setHeader(k, v);
      return this;
    },
    json(obj) {
      if (!res.getHeader("Content-Type")) {
        res.setHeader("Content-Type", "application/json");
      }
      res.statusCode = this.statusCode;
      res.end(JSON.stringify(obj));
      return this;
    },
    end(data) {
      res.statusCode = this.statusCode;
      res.end(data);
      return this;
    },
  };
  return shim;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = (env.VITE_SITE_URL || "").replace(/\/$/, "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      localApiRoutes(env),
      {
        name: "inject-site-url",
        transformIndexHtml(html) {
          if (!siteUrl) {
            return html.replace(/\s*<meta property="og:url" content="%VITE_SITE_URL%\/" \/>\s*/g, "\n    ");
          }
          return html
            .replace(/%VITE_SITE_URL%/g, siteUrl)
            .replace(/content="\/og-image\.png"/g, `content="${siteUrl}/og-image.png"`);
        },
      },
    ],
  };
});
