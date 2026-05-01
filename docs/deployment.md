# Deployment

Per [ADR 0001](./adr/0001-foundational-stack.md), Brilworks runs on **Vercel** in
region **`iad1`** (us-east). This document covers the staging URL, how
auto-deploy works, secrets policy, and how to roll back.

> **Status:** the code-side prep (this app, `vercel.json`, `/api/health`) is
> ready. The Vercel project itself must be linked to the GitHub repo by an
> account holder before the staging URL goes live. The placeholder below is
> updated in the same PR that connects the repo to Vercel.

## Environments

We run a **single** environment for now: `staging`. Production will stand up
once we have a real customer (per [BRI-4](#) scope).

| Environment | Trigger             | URL                                      |
| ----------- | ------------------- | ---------------------------------------- |
| staging     | merge to `main`     | _set after Vercel project is linked_     |
| preview     | open PR             | `https://<branch>--brilworks-app.vercel.app` (auto) |
| local       | `pnpm dev`          | `http://localhost:3000`                  |

`staging` maps to Vercel's "Production" environment on the project. There is
no Vercel "Preview-as-staging" indirection — the Production deploy on Vercel
**is** our staging.

## Auto-deploy on `main`

The Vercel GitHub integration watches the repo. On every push to `main` Vercel
queues a Production deploy. Typical wall-clock: <3 minutes for this scaffold.

Verify a deploy reached the staging URL by hitting the health route:

```bash
curl https://<staging-url>/api/health
# {"ok":true,"deploy":{"commitSha":"...","commitShaShort":"...","deploymentId":"...","region":"iad1","env":"production"}}
```

`commitShaShort` should match the `main` HEAD commit you just merged.

## Secrets and env vars

**Rules**

- No plaintext secrets in the repo, ever. `.gitleaks` runs on every PR.
- `.env.local` is gitignored and is **only** for local dev.
- All staging/production secrets live in Vercel **Project Settings → Environment Variables**, scoped to `Production` (and `Preview` if needed).
- Secret rotation is a manual rotate-in-Vercel + redeploy.

**Required env vars for the app to boot in staging today**

| Name | Scope | Notes |
| ---- | ----- | ----- |
| _(none yet — scaffold has no DB or auth)_ | | Added by [BRI-5](#) (observability) and [BRI-6](#) (auth). |

**Vercel auto-injects** the following on every deploy — do not set them manually:

- `VERCEL_GIT_COMMIT_SHA` — commit being deployed
- `VERCEL_DEPLOYMENT_ID` — unique deploy id (used in rollback)
- `VERCEL_REGION` — runtime region
- `VERCEL_ENV` — `production` | `preview` | `development`

These power `/api/health`.

## Rollback

A bad deploy is reverted in under a minute by promoting the previous good
deployment. Two paths, dashboard first:

### 1. Vercel dashboard (preferred)

1. Open the project → **Deployments** tab.
2. Find the most recent **Ready** deploy that predates the bad one.
3. Click `…` → **Promote to Production**.

The staging URL flips immediately. No git revert required.

### 2. Vercel CLI fallback

```bash
# List recent deploys for the project
vercel ls brilworks-app

# Promote a specific deployment URL back to Production
vercel promote <deployment-url> --scope <team>
```

If a bad commit is on `main`, the **right follow-up** after rolling back is to
revert it on `main` (`git revert <bad-sha> && git push origin main`) so the
next deploy doesn't re-introduce the regression.

### When to roll back

- `/api/health` returns non-200, or
- a synthetic check (added later via [BRI-5](#)) fires, or
- a human notices the staging URL is broken.

Roll back **first**, debug **second**. Reverts on a single-engineer team are cheap.

## First-time Vercel project setup

This is the manual one-time hookup an account holder must do (see [BRI-4](#)
for the live request).

1. Sign in to Vercel with the account that should own the project.
2. **Add New → Project** → import `HiteshR90/brilworks-app` from GitHub.
3. Framework preset: **Next.js** (auto-detected).
4. Root directory: `./`. Build command: `pnpm build` (auto from `vercel.json`).
5. Region: `iad1` (auto from `vercel.json`).
6. Skip env vars on first deploy (none required for the scaffold).
7. **Deploy**. Capture the `*.vercel.app` URL and update this doc + the
   closing comment on [BRI-4](#).

After that, every push to `main` auto-deploys.
