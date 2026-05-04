# Deployment

The Brilworks app shell is hosted on **Cloudflare Pages**, deployed from the
`main` branch via Cloudflare's GitHub OAuth integration. See
[ADR 0003](./adr/0003-staging-moves-to-cloudflare-pages.md) for the rationale
(it supersedes the GitHub Pages decision in
[ADR 0002](./adr/0002-staging-uses-github-pages.md), which itself superseded
the Vercel decision in
[ADR 0001 §4](./adr/0001-foundational-stack.md#4-deployment-target--vercel-for-the-web-tier-region-iad1-us-east-1)).

> **Status:** repo is public; Cloudflare Pages project is connected to the
> repo via OAuth; build runs via [`@cloudflare/next-on-pages`](https://github.com/cloudflare/next-on-pages);
> there is **no** stored `CLOUDFLARE_API_TOKEN` in CI.

## Environments

We run a **single** environment for now: `staging`. Production stands up once
we have a real customer.

| Environment | Trigger         | URL                                                     |
| ----------- | --------------- | ------------------------------------------------------- |
| staging     | merge to `main` | https://brilworks-app.pages.dev/ (set after CF connect) |
| local       | `pnpm dev`      | http://localhost:3000                                   |

Cloudflare Pages also publishes a preview deployment per branch by default;
we keep that off to preserve the free-tier build budget. Re-enable when the
team wants per-PR previews.

## Auto-deploy on `main`

When the Cloudflare Pages project is connected to the GitHub repo, Cloudflare
listens for pushes (via GitHub OAuth — no token in our CI) and runs the build
on its own infrastructure. Wall-clock for the placeholder app is ~2–3 minutes
from push to live.

Build configuration in the Cloudflare Pages dashboard:

| Field                 | Value                                                 |
| --------------------- | ----------------------------------------------------- |
| Framework preset      | `Next.js`                                             |
| Build command         | `pnpm install && pnpm exec @cloudflare/next-on-pages` |
| Build output dir      | `.vercel/output/static`                               |
| Root directory        | `/`                                                   |
| Production branch     | `main`                                                |
| Compatibility flags   | `nodejs_compat` (Production)                          |
| Environment variables | see "Secrets and env vars" below                      |

The same flags also live in [`wrangler.toml`](../wrangler.toml) for clarity
and for `wrangler pages dev` to pick up locally.

### Verifying a deploy

```bash
curl https://<your-pages-url>/api/health
# {"ok":true,"deploy":{"commitSha":"...","commitShaShort":"...","runId":"...","ref":"main","builtAt":"..."}}
```

`commitShaShort` should match the first seven chars of the `main` HEAD commit
that was just merged. The route is `force-static` JSON evaluated at build
time, so the SHA is whatever the build snapshot captured.

## Secrets and env vars

**Rules**

- No plaintext secrets in the repo, ever. `gitleaks` runs on every PR
  ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).
- `.env.local` is gitignored and is **only** for local dev.
- Runtime secrets live in **Cloudflare Pages env vars** (CF dashboard →
  Workers & Pages → brilworks-app → Settings → Environment variables).
  Mark sensitive ones as _Encrypted_.
- The build runs on Cloudflare's infra, not GitHub Actions, so the env vars
  must be set on the Cloudflare side (not in GitHub Actions secrets).
- Secret rotation: rotate the value in Cloudflare Pages env vars; redeploy
  by pushing a no-op commit (or hitting "Retry deployment" in the CF dash).

**Required env vars for the app to boot in staging**

| Name                     | Required at | Source                                                        |
| ------------------------ | ----------- | ------------------------------------------------------------- |
| `AUTH_SECRET`            | runtime     | `openssl rand -base64 32`                                     |
| `AUTH_URL`               | runtime     | the staging URL, e.g. `https://brilworks-app.pages.dev`       |
| `AUTH_GOOGLE_ID`         | runtime     | Google Cloud Console → OAuth client                           |
| `AUTH_GOOGLE_SECRET`     | runtime     | Google Cloud Console → OAuth client (encrypted)               |
| `RESEND_API_KEY`         | runtime     | Resend dashboard → API keys (encrypted)                       |
| `EMAIL_FROM`             | runtime     | sender address, e.g. `auth@brilworks.dev`                     |
| `DATABASE_URL`           | runtime     | Neon dev branch connection string (encrypted)                 |
| `NEXT_PUBLIC_GIT_SHA`    | build       | Cloudflare auto-injects `CF_PAGES_COMMIT_SHA`; map it in dash |
| `NEXT_PUBLIC_SENTRY_DSN` | build       | Sentry project DSN (no secret leak — public DSN)              |
| `NEXT_PUBLIC_SENTRY_ENV` | build       | `staging`                                                     |

`getHealth()` in [`lib/health.ts`](../lib/health.ts) reads
`GITHUB_SHA` / `GITHUB_RUN_ID` / `GITHUB_REF_NAME` from the build env. On
Cloudflare these are not auto-injected; the dashboard maps Cloudflare's
`CF_PAGES_COMMIT_SHA` and `CF_PAGES_BRANCH` into the same names so
`getHealth()` keeps working unchanged.

## Rollback

Cloudflare Pages keeps every previous deployment around. Rollback options,
fastest to slowest:

1. **Cloudflare Pages dashboard** → Deployments → pick a known-good build →
   "Rollback to this deployment". Live within seconds; no code change.
2. **Revert on `main`**:
   ```bash
   git revert <bad-sha>
   git push origin main
   ```
   CF rebuilds from the reverted state (~2–3 minutes).

For deeper investigation, the bad deployment stays in the dashboard list —
re-deploy it later if the rollback was a mistake.

### When to roll back

- `/api/health` returns non-200, or
- the staging uptime synthetic ([`.github/workflows/uptime.yml`](../.github/workflows/uptime.yml))
  fires, or
- a human notices the staging URL is broken.

Roll back **first**, debug **second**.

## First-time Cloudflare Pages setup

One-time steps an account holder must perform to wire this up. Required
before [BRI-6](#) (auth) can ship to staging.

1. Create a Cloudflare account (free tier, no card required).
2. In the dashboard: **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → authorize the Cloudflare GitHub app on the
   `HiteshR90/brilworks-app` repo (OAuth — no token to copy).
3. In the project settings, set the build configuration table above.
4. Add the required env vars from "Secrets and env vars" above.
5. Set the GitHub repo variable `STAGING_HEALTH_URL` to
   `https://<cf-pages-url>/api/health` so
   [`uptime.yml`](../.github/workflows/uptime.yml) starts pinging the new URL.
6. Trigger the first deployment from the dashboard, then verify
   `/api/health` returns 200 with the right SHA.

After that, every push to `main` auto-deploys. There is no GitHub Actions
deploy step (the old one was removed in this PR).
