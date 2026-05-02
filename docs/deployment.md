# Deployment

The Brilworks app shell is hosted on **GitHub Pages**, served from the `main`
branch via GitHub Actions. See [ADR 0002](./adr/0002-staging-uses-github-pages.md)
for the rationale (it supersedes the Vercel decision in
[ADR 0001](./adr/0001-foundational-stack.md#4-deployment-target--vercel-for-the-web-tier-region-iad1-us-east-1)).

> **Status:** repo is public; Pages source is "GitHub Actions"; deploy
> workflow lives at [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

## Environments

We run a **single** environment for now: `staging`. Production stands up once
we have a real customer.

| Environment | Trigger             | URL                                              |
| ----------- | ------------------- | ------------------------------------------------ |
| staging     | merge to `main`     | https://hiteshr90.github.io/brilworks-app/       |
| local       | `pnpm dev`          | http://localhost:3000                            |

There is no per-PR preview yet — GitHub Pages publishes a single environment
per repo. Add a preview-deploys workflow if/when the team wants it.

## Auto-deploy on `main`

Every push to `main` triggers
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). The job
runs `pnpm install --frozen-lockfile && pnpm build` with
`GITHUB_PAGES_BUILD=true` (which switches Next.js into `output: "export"` with
the right `basePath`/`assetPrefix`), uploads `out/` via
`actions/upload-pages-artifact@v3`, and deploys via `actions/deploy-pages@v4`.
The workflow uses the **workflow-scoped `GITHUB_TOKEN`** — no long-lived
deploy token is stored anywhere.

Typical wall-clock for the placeholder app: under 2 minutes from push to live.

### Verifying a deploy

```bash
curl https://hiteshr90.github.io/brilworks-app/api/health
# {"ok":true,"deploy":{"commitSha":"...","commitShaShort":"...","runId":"...","ref":"main","builtAt":"..."}}
```

`commitShaShort` should match the first seven chars of the `main` HEAD commit
that was just merged. The route is exported as a static `force-static` JSON
response at build time, so the SHA is whatever the deploy snapshot captured.

## Secrets and env vars

**Rules**

- No plaintext secrets in the repo, ever. `gitleaks` runs on every PR
  ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).
- `.env.local` is gitignored and is **only** for local dev.
- Runtime secrets live in **GitHub Actions secrets** (Settings → Secrets and
  variables → Actions). Reference them in the workflow via
  `${{ secrets.NAME }}`.
- Static-export means there is no server-side runtime in staging today, so
  no runtime secrets are wired in yet. Server-runtime needs (auth, DB,
  Sentry write keys) get revisited when [BRI-5](#) (observability) and
  [BRI-6](#) (auth) ship — at which point the deploy story may need to
  change too (see ADR 0002).
- Secret rotation: rotate the value in GitHub Actions secrets, then push a
  no-op commit (or run the workflow manually) to redeploy with the new value.

**Required env vars for the app to boot in staging today**

| Name | Scope | Notes |
| ---- | ----- | ----- |
| _(none yet — placeholder app has no DB or auth)_ | | Added by [BRI-5](#) and [BRI-6](#). |

**GitHub Actions auto-injects** the following on every deploy — do not set
them manually:

- `GITHUB_SHA` — commit being deployed
- `GITHUB_RUN_ID` — workflow run id
- `GITHUB_REF_NAME` — branch name (`main` for staging)
- `GITHUB_TOKEN` — workflow-scoped token used by `actions/deploy-pages`

`GITHUB_SHA` / `GITHUB_RUN_ID` / `GITHUB_REF_NAME` are baked into
`/api/health` at build time via `getHealth()` in
[`lib/health.ts`](../lib/health.ts).

## Rollback

A bad deploy is reverted by pushing a revert commit on `main`. There is no
"promote previous deploy" primitive on GitHub Pages — re-deploying an earlier
commit *is* the rollback.

```bash
git revert <bad-sha>
git push origin main
```

Within ~2 minutes the deploy workflow re-runs against the reverted state and
the staging URL is healthy again.

For an even faster recovery while you investigate (the staging URL goes back
to a known-good state without you needing to identify the bad commit), trigger
the deploy workflow manually against the last known good commit:

```bash
gh workflow run deploy.yml --ref <good-sha>
```

This works because `workflow_dispatch` is enabled in
[`deploy.yml`](../.github/workflows/deploy.yml).

### When to roll back

- `/api/health` returns non-200, or
- a synthetic check (added later via [BRI-5](#)) fires, or
- a human notices the staging URL is broken.

Roll back **first**, debug **second**. Reverts on a small team are cheap.

## First-time GitHub Pages setup

This is the one-time setup an account holder did when wiring this up; kept
for reference in case we need to recreate the environment.

1. Make sure the repo is **public** (GitHub Pages on the free tier requires
   public repos).
2. Enable Pages via the API:
   ```bash
   gh api -X POST /repos/HiteshR90/brilworks-app/pages -f build_type=workflow
   ```
   Or in the dashboard: Settings → Pages → Source: **GitHub Actions**.
3. Push the
   [`deploy.yml`](../.github/workflows/deploy.yml) workflow to `main` —
   first run publishes the site.
