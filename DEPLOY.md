# Deploying beagle

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Vercel](https://vercel.com) account (free tier is fine)
- Git (recommended)

## One-time setup

```bash
cd c:\Projects\promotype
npm install
npm run build    # verify build passes
git init
git add .
git commit -m "beagle demo ready for deploy"
```

Push to GitHub (or GitLab/Bitbucket), then import the repo in the Vercel dashboard.

## Deploy with Vercel CLI

```bash
npm i -g vercel
vercel login
vercel          # preview deployment
vercel --prod   # production URL — use this in email/deck
```

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SITE_URL` | **Recommended** | Absolute URL for Open Graph previews (e.g. `https://beagle-demo.vercel.app`, no trailing slash). Rebuild after setting. |
| `LLM_API_KEY` | Optional | Enables **AI** evolution mode via `/api/propose-challenger`. |
| `LLM_API_BASE` | Optional | Default `https://api.openai.com/v1` |
| `LLM_MODEL` | Optional | Default `gpt-4o-mini` |

After adding env vars, trigger a **redeploy**.

## Share links

| Link | Behavior |
|------|----------|
| `https://YOUR_DOMAIN/?demo=1` | Auto-loads populated demo (generation 9 + 8 rounds history) |
| `https://YOUR_DOMAIN/?present=1` | Same + autoplay at 4× |
| `https://YOUR_DOMAIN/` | Landing with **Open populated demo** CTA |

## Local production preview (offline backup)

```bash
npm run build
npm run preview
# open http://localhost:4173/?demo=1
```

## AI mode locally

Plain `npm run dev` does **not** serve `/api`. To test the LLM proxy locally:

```bash
vercel dev
```

## Optional: custom domain

Vercel → Project → Settings → Domains → add e.g. `demo.yourcompany.com`, then set `VITE_SITE_URL` to that URL and redeploy.

## Enabling AI evolution (optional)

1. In Vercel → **Settings → Environment Variables**, add `LLM_API_KEY` for **Production**.
2. Redeploy the project.
3. Open the live demo → **Evolution → AI** toggle should show a **green dot**.
4. Run one **Decide & evolve** cycle — challenger rationale should show `simulated` badge only if the API fails; successful calls show the model name.

Test the endpoint directly (after deploy):

```bash
curl -X POST https://YOUR_DOMAIN/api/propose-challenger \
  -H "Content-Type: application/json" \
  -d '{"winner":{"align":"center","weight":"bold","icon":true,"spacing":"loose","navStyle":"underline"},"goal":"ctr","history":[]}'
```

Without a key you get `501` and the app falls back to the local stub — safe for demos.

## Troubleshooting

- **OG image broken in Slack** — set `VITE_SITE_URL` and redeploy so `og:image` is absolute.
- **AI toggle always falls back** — check `LLM_API_KEY` is set for Production environment; check Vercel function logs for `/api/propose-challenger`.
- **Build fails** — run `npm run build` locally and fix errors before pushing.
