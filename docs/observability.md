# Observability

The 30-second answer to **"is staging healthy right now?"** lives at the top
of this page. Everything below is the implementation contract.

> Staging URL: <https://hiteshr90.github.io/brilworks-app/>
> Stack source of truth: [ADR 0001](./adr/0001-foundational-stack.md), with
> the deploy-target change in
> [ADR 0002](./adr/0002-staging-uses-github-pages.md).

## "Is staging healthy?" — 30-second runbook

Open these four tabs in order. If everything is green, staging is healthy.

1. **Synthetic uptime check** —
   [Staging uptime synthetic workflow](https://github.com/HiteshR90/brilworks-app/actions/workflows/uptime.yml).
   Latest run should be green within the last ~5 minutes.
2. **Health endpoint** —
   <https://hiteshr90.github.io/brilworks-app/api/health>.
   Should return `200` with `{"ok":true,...}` and a `commitShaShort` matching
   the latest `main` HEAD.
3. **Sentry issues (last 1h)** — see Sentry project link below.
   Zero new unresolved issues = clean.
4. **Latest deploy** —
   [Deploy workflow](https://github.com/HiteshR90/brilworks-app/actions/workflows/deploy.yml).
   Latest run on `main` should be green.

If any of those four are red, the site may be broken. Follow the rollback
playbook in [docs/deployment.md](./deployment.md#rollback).

## What we instrument, and where

| Concern                   | Tool                         | Free tier               | Where it lives                                                                                   |
| ------------------------- | ---------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| Browser JavaScript errors | Sentry (`@sentry/react`)     | 5k errors/mo            | [`lib/sentry.ts`](../lib/sentry.ts), mounted via [`app/sentry-init.tsx`](../app/sentry-init.tsx) |
| Build / deploy logs       | GitHub Actions               | unlimited (public repo) | [Actions runs](https://github.com/HiteshR90/brilworks-app/actions)                               |
| Synthetic uptime ping     | GitHub Actions cron          | unlimited               | [`.github/workflows/uptime.yml`](../.github/workflows/uptime.yml)                                |
| Static health snapshot    | Next.js `force-static` route | n/a                     | [`app/api/health/route.ts`](../app/api/health/route.ts), [`lib/health.ts`](../lib/health.ts)     |

### What we deliberately **don't** instrument yet

- **Server-side logs (Pino) and log aggregation (Axiom).** Deferred per
  [ADR 0002](./adr/0002-staging-uses-github-pages.md): there is no server
  runtime in staging today (`output: "export"`). Re-instrument when SSR
  returns and ADR 0002 is revisited.
- **Distributed tracing / metrics.** No service to trace yet.
- **Real-User Monitoring (Vercel Analytics / Speed Insights).** Tied to
  Vercel; not applicable on GitHub Pages.
- **PII scrubbing rules in Sentry.** Sentry default scrubbing is sufficient
  until [BRI-6](#) lands actual user sessions.

## Dashboards

Pin these in your browser (all are linkable from a fresh tab):

- **Sentry project:** see [`SENTRY_PROJECT_URL`](#) — populated once the
  CEO provisions the Sentry org and adds `SENTRY_DSN_STAGING` as a repo
  secret. Until then this row is intentionally a placeholder.
- **GitHub Actions overview:**
  <https://github.com/HiteshR90/brilworks-app/actions>
- **Uptime synthetic workflow:**
  <https://github.com/HiteshR90/brilworks-app/actions/workflows/uptime.yml>
- **Deploy workflow:**
  <https://github.com/HiteshR90/brilworks-app/actions/workflows/deploy.yml>
- **CI workflow:**
  <https://github.com/HiteshR90/brilworks-app/actions/workflows/ci.yml>

## Errors — Sentry

We use [`@sentry/react`](https://docs.sentry.io/platforms/javascript/guides/react/)
in **client-only** mode. The SDK is initialized inside `useEffect` from
[`app/sentry-init.tsx`](../app/sentry-init.tsx) — it ships in every page via
the root layout, but only attaches to `window.onerror` /
`unhandledrejection` once Sentry has a real DSN.

### Init contract

The init helper in [`lib/sentry.ts`](../lib/sentry.ts) reads three
`NEXT_PUBLIC_*` env vars at build time:

| Var                      | Required         | Default                  | Source                                                                          |
| ------------------------ | ---------------- | ------------------------ | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes (else no-op) | —                        | `secrets.SENTRY_DSN_STAGING` in [`deploy.yml`](../.github/workflows/deploy.yml) |
| `NEXT_PUBLIC_SENTRY_ENV` | No               | `"staging"`              | hard-coded in `deploy.yml`                                                      |
| `NEXT_PUBLIC_GIT_SHA`    | No               | `undefined` (no release) | `${{ github.sha }}` in `deploy.yml`                                             |

When `NEXT_PUBLIC_SENTRY_DSN` is empty (local dev, PR builds without
secrets, builds before the CEO provisions the Sentry account), `initSentry`
returns `"no-dsn"` and Sentry is not loaded — zero network traffic, zero
runtime cost, zero impact on bundle behaviour.

`tracesSampleRate` is pinned to `0` — errors-only, no performance
monitoring. Re-evaluate once we have user traffic worth profiling.

### Verifying the pipeline (deliberate-error test)

Acceptance criterion: _a deliberate error in staging shows up in the error
tracker within 1 minute._

1. Open <https://hiteshr90.github.io/brilworks-app/sentry-test/>.
2. Click **Throw test error**.
3. Within ~1 minute, the error appears in the Sentry project as an
   unresolved issue with the message
   `BRI-5 deliberate error — <ISO-8601 timestamp> — verifying Sentry pipeline`.

If step 3 doesn't happen:

- Confirm `SENTRY_DSN_STAGING` is set in repo secrets (Settings → Secrets →
  Actions). If the secret is missing, the build inlines an empty DSN and
  Sentry is a no-op — that's the most likely cause.
- Confirm the latest deploy ran _after_ the secret was added — env-var
  changes do not rebuild prior deploys. Trigger a manual rebuild
  (`gh workflow run deploy.yml`) if needed.
- Inspect the browser console on `/sentry-test/` — `initSentry` failures
  surface there.

## Logs — queryable from outside the deploy host

There is no app-level server log channel today (no server runtime). The
two channels we _do_ have are both queryable from outside the deploy host
without SSH:

### 1. GitHub Actions runs (build, deploy, uptime, CI)

```bash
# Last 20 runs across all workflows
gh run list --repo HiteshR90/brilworks-app --limit 20

# Logs for the most recent deploy
gh run view --repo HiteshR90/brilworks-app --workflow deploy.yml --log

# Logs for the most recent uptime check
gh run view --repo HiteshR90/brilworks-app --workflow uptime.yml --log
```

These are also browseable in the UI:
<https://github.com/HiteshR90/brilworks-app/actions>.

The repo is public, so Actions logs are publicly readable. **Do not
`echo`/`gh secret list` secrets in workflow steps.** `gitleaks` runs on
every PR; treat workflow log redaction as a defense-in-depth, not the
primary control.

### 2. Sentry breadcrumbs

Sentry's React SDK captures `console.error` / `console.warn` calls,
fetch/XHR requests, navigation events, and React render-time errors as
breadcrumbs attached to whatever exception the user hit. To see them: open
an issue in Sentry → "Breadcrumbs" tab.

This is not "all logs" — it's "logs leading up to errors." That's the
trade-off of running on a static host today.

## Uptime — synthetic check

[`.github/workflows/uptime.yml`](../.github/workflows/uptime.yml) runs every
5 minutes (cron `*/5 * * * *`, best-effort under GitHub Actions load). Each
run:

1. Curls `https://hiteshr90.github.io/brilworks-app/api/health` with a 15s
   timeout.
2. Asserts HTTP 200.
3. Asserts the response body has `ok: true`.
4. On failure, opens a GitHub issue (label `uptime-incident,staging`) with
   the run URL, HTTP status, and response body.

### Why a scheduled GitHub Actions job and not Better Stack / UptimeRobot

[ADR 0002](./adr/0002-staging-uses-github-pages.md) constrains us to "no
new vendor accounts, no stored deploy tokens, no recurring spend" while the
staging tier is a placeholder. Better Stack / UptimeRobot would each
introduce a new third-party account with a UI password and per-monitor
limits. A GitHub Actions cron is `$0`, requires no new account, and runs
out-of-process from the deploy host (literally on a different GitHub
runner) — sufficient for the BRI-5 acceptance bar.

When we move off GitHub Pages and want sub-minute granularity, swap in
Better Stack and delete this workflow. Two-way door.

### Manual runs

You can trigger a synthetic check on demand without waiting for the cron:

```bash
gh workflow run uptime.yml --repo HiteshR90/brilworks-app
gh run watch --repo HiteshR90/brilworks-app
```

## Provisioning checklist

Before the BRI-5 acceptance criterion _"deliberate error in staging shows
up in the error tracker within 1 minute"_ can be verified, the CEO needs
to perform a one-time setup:

- [ ] Create a Sentry account / org (free tier is sufficient — 5k errors/mo).
- [ ] Create a single project, platform `JavaScript / React`, name
      `brilworks-app`.
- [ ] Copy the **client DSN** (NOT the auth token).
- [ ] In GitHub: Settings → Secrets and variables → Actions → New repository
      secret → name `SENTRY_DSN_STAGING`, value the DSN.
- [ ] Trigger a redeploy: `gh workflow run deploy.yml`.
- [ ] Run the deliberate-error test in _Verifying the pipeline_ above.
- [ ] Update the **Sentry project** dashboard link at the top of this page
      with the actual project URL.

This setup is owned by the CEO because account creation needs a payment-
method-attached identity even on the free tier (Sentry requires a verified
email at minimum). It does not need board approval — free tier with no
recurring spend is within the [ADR 0002](./adr/0002-staging-uses-github-pages.md)
posture.
