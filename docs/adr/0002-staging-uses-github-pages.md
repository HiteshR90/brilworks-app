# ADR 0002 — Staging uses GitHub Pages (supersedes ADR 0001 §4)

- Status: Accepted
- Date: 2026-05-02
- Author: FoundingEngineer (acting CTO)
- Decider: CEO (delegated, with board endorsement on
  [BRI-4](../../docs/adr/../../README.md))
- Supersedes: [ADR 0001 §4 — Deployment target](./0001-foundational-stack.md#4-deployment-target--vercel-for-the-web-tier-region-iad1-us-east-1)

## Context

[ADR 0001](./0001-foundational-stack.md) picked **Vercel `iad1`** as the
web-tier deployment target. When we tried to land that decision on
[BRI-4](#) ("deploy a staging URL with auto-deploy on `main`"), the board
rejected the corresponding spend / access approval — both proposed paths
(dashboard import + stored `VERCEL_TOKEN`) were declined with no decision
note, and the CEO's productivity audit on
[BRI-65](#) named two binding constraints:

1. **No long-lived deploy token** stored in CI / Paperclip secrets.
2. **No third-party deploy-vendor account holder** — interpreted broadly as
   "don't lock the company into another paid PaaS just to host a placeholder
   tier."

The staging tier is a placeholder app today (no DB, no auth, no SSR
requirement). [BRI-5](#) (observability) and [BRI-6](#) (auth) will
introduce real server-side concerns later.

## Decision

**Staging is deployed to GitHub Pages from the same repo that hosts the
code, via a GitHub Actions workflow. Next.js runs in static-export mode
(`output: "export"`).**

- URL: `https://hiteshr90.github.io/brilworks-app/`
- Trigger: every push to `main`
- Auth: workflow-scoped `GITHUB_TOKEN` (no stored long-lived token)
- Repo visibility: public (required by GitHub Pages on the free tier)

### What changes from ADR 0001

- §4 (Deployment target = Vercel `iad1`) is **superseded**. We are not on
  Vercel.
- §1 (Next.js 15 App Router on React 19) **stands**, but `output: "export"`
  is now active. This drops Route Handlers (other than `force-static` ones),
  ISR, middleware, and the Image Optimization API for the placeholder phase.
- §3 (Postgres / Drizzle), §5 (Auth.js), §6 (Sentry / Pino / Axiom): stand,
  but their integration is deferred until the staging tier can host a server
  runtime again — which means revisiting *this* ADR before
  [BRI-5](#) / [BRI-6](#) implementation.
- §7 (pnpm, single repo): stands.
- §2 (TypeScript on Node 22): stands (the build still runs on Node 22 in
  GitHub Actions).

## Alternatives considered

- **Vercel** — declined by the board on [BRI-4](#). Re-considering it
  requires a fresh approval round.
- **Cloudflare Pages** — would have preserved SSR via
  `@cloudflare/next-on-pages`, but reintroduces a third-party-account-holder
  ask similar to Vercel and was endorsed by the CEO as the *fallback only*
  if the board specifically wanted SSR-from-day-one. Board did not.
- **Netlify** — same shape as Cloudflare Pages, plus a paid tier for
  private repos. Same downside.
- **Fly.io** — required `FLY_API_TOKEN` in CI, fails constraint 1.
- **Render** — free tier sleeps after 15 min idle, bad UX for a staging URL
  the team can hit ad hoc.
- **GitHub Pro** — would have kept the repo private and used GitHub Pages,
  but $4/seat/mo is the org's first recurring SaaS subscription. The board
  preferred to relax the (never-explicit) "private by default" posture
  rather than introduce that line item.

## Consequences

### What we get

- Zero new vendor accounts; zero stored deploy tokens; zero recurring spend.
- Auto-deploy on every `main` push within ~2 minutes.
- Repo, deploy logs, and infra config all in one place (GitHub).
- Trivial rollback: `git revert <bad-sha> && git push origin main` re-deploys.

### What we trade

- **No SSR / Route Handlers / middleware / ISR** in staging until this ADR
  is revisited. The current scaffold has only `/api/health`, which is
  pre-rendered at build time as `force-static` and therefore still works.
- **No per-PR previews.** GitHub Pages publishes a single environment per
  repo. PR previews would need a separate strategy (e.g. uploading static
  builds as workflow artifacts and serving them).
- **No region pinning.** GitHub Pages is served from GitHub's CDN, not our
  choice. Latency-sensitive concerns get revisited with the staging-tier
  rewrite when server runtime returns.
- **Public repo for now.** Anything pushed to `main` while public is
  effectively permanent in archives even if we later flip the repo back to
  private. Mitigation: gitleaks pre-commit / on every PR; no business logic
  in the repo today.

### When to revisit

This ADR gets re-opened when **any** of the following becomes true:

- [BRI-5](#) (observability) needs server-side instrumentation that can't
  be done from the static client.
- [BRI-6](#) (auth) lands and we have user sessions / DB calls that must
  run server-side.
- We need per-PR preview environments.
- We need to make the repo private again before paid hosting is acceptable.
- Any compliance / region requirement appears.

At that point the choice is: pay for a server-runtime PaaS (Vercel /
Cloudflare Pages / Fly / Render / etc.) or stand up our own container on a
managed host. That's a fresh ADR.
