# ADR 0003 — Staging moves to Cloudflare Pages (supersedes ADR 0002 §Decision)

- Status: Accepted
- Date: 2026-05-04
- Author: FoundingEngineer (acting CTO)
- Decider: CEO / board (approval `59c6eeb3-d69f-4f6b-ad81-94222fa0b182`)
- Supersedes: [ADR 0002 §Decision](./0002-staging-uses-github-pages.md#decision)

## Context

[ADR 0002](./0002-staging-uses-github-pages.md) put staging on GitHub
Pages with Next.js `output: "export"`. That ADR explicitly named the
revisit triggers — among them: "[BRI-6] (auth) lands and we have user
sessions / DB calls that must run server-side."

[BRI-6](#) is the auth scaffold. Auth.js v5 with database sessions
needs Route Handlers, middleware, and SSR — none of which run on
GitHub Pages' static export. The trigger fires.

The board's BRI-4 approval ([1385f2e9](#)) had already named the SSR
fallback: **Cloudflare Pages**, free tier, OAuth GitHub deploy
(no stored long-lived token), no paid PaaS account holder. Approval
[59c6eeb3](#) authorizes the move.

## Decision

**Staging moves to Cloudflare Pages, deployed via Cloudflare's OAuth
GitHub integration. Next.js builds in normal SSR mode using
[`@cloudflare/next-on-pages`](https://github.com/cloudflare/next-on-pages).**

- Build command (set in Cloudflare Pages dashboard):
  `pnpm install && pnpm exec @cloudflare/next-on-pages`
- Output directory: `.vercel/output/static`
- Compatibility flag: `nodejs_compat` (set in `wrangler.toml` and the
  Cloudflare Pages dashboard)
- Auth: workflow-scoped — Cloudflare Pages clones via its GitHub OAuth
  connection. **No `CLOUDFLARE_API_TOKEN` is stored in GitHub Actions
  or anywhere in this repo.** Constraint #1 from
  [BRI-4](#) is preserved.
- Repo visibility: stays public for now. We can flip back to private
  on Cloudflare Pages without changing tier (CF Pages supports
  private repos on the free tier, unlike GitHub Pages — so flipping
  private later is a one-click operation).

## Account-holder obligation

Cloudflare is a new vendor relationship. The CEO (or designate) holds
the Cloudflare account. Free tier — **no credit card** required for
the build limits (500 builds/month) we will hit at this size. The card
question gets re-opened only when we exceed the free tier.

This is the second account holder relationship after GitHub. Adding
_either_ of these was rejected as Vercel back in [BRI-4](#); Cloudflare
distinguishes itself on (a) free tier without card, (b) no stored
deploy token, (c) explicitly named as the SSR fallback in the BRI-4
approval thread.

## What changes from ADR 0002

- §Decision — superseded. We are no longer on GitHub Pages.
- §"What we trade — No SSR / Route Handlers / middleware / ISR" —
  superseded. All three are restored.
- §"What we trade — No per-PR previews" — partially restored.
  Cloudflare Pages publishes a preview deployment per branch/PR. We
  do not enable previews on every PR by default to keep the free-tier
  build budget — preview-on-label is an option later if the team wants it.
- §"What we trade — Public repo for now" — stands. Flipping back to
  private is now one click on the Cloudflare side; no plan change
  required.
- §"What we trade — No region pinning" — stands. Cloudflare's edge is
  also CDN-distributed; not our pick.
- The `output: "export"` toggle in `next.config.mjs` is removed.
- The build's `force-static` `/api/health` route stays — it is also
  fully compatible with `next-on-pages` and continues to satisfy
  [BRI-5](#)'s uptime synthetic.

## Alternatives considered (deltas vs ADR 0002)

- **Stay on GitHub Pages, do auth client-side via Clerk / Auth0 /
  Supabase Auth.** Considered as Option B in the BRI-6 plan. Rejected
  because (a) it spends the same vendor-relationship cost as A
  (still adds a third-party account holder) without unblocking
  [BRI-5](#)'s server-side observability, (b) it walks back
  [ADR 0001 §5](./0001-foundational-stack.md#5-auth--authjs-nextauth-v5-with-drizzlepostgres-adapter)'s
  "user records live in our Postgres," and (c) "protected routes" on a
  static site are client-side only — anyone curling the HTML sees the
  page shell.
- **OpenNext Cloudflare Workers adapter
  ([opennext.js.org/cloudflare](https://opennext.js.org/cloudflare)).**
  This is the recommended replacement that the deprecation notice on
  `@cloudflare/next-on-pages` points to. Rejected for now because the
  Workers deploy path requires a `CLOUDFLARE_API_TOKEN` stored in
  GitHub Actions — that violates [BRI-4](#)'s constraint #1
  ("no long-lived deploy token"). Re-evaluate when (a) Cloudflare
  ships an OAuth path for the Workers adapter, or (b) the
  no-deploy-token constraint is consciously relaxed.
- **Re-running Vercel.** Already declined by the board on
  [BRI-4](#) ([811793b4](#)). Out of scope for this ADR.

## Known tech debt this ADR creates

- `@cloudflare/next-on-pages` is officially deprecated. We are
  adopting a deprecated tool _because_ its successor breaks our
  no-stored-token constraint. We must revisit this within ~6 months
  or sooner if the tool stops receiving security updates.
- Next.js 15.1.6 is pinned by the existing scaffold and `pnpm install`
  flags it as carrying CVE-2025-66478. Bumping is its own change and
  is tracked separately from this ADR.

## Two-way-door audit

| Decision         | Cost to reverse                                          | Within a week? |
| ---------------- | -------------------------------------------------------- | -------------- |
| Cloudflare Pages | `next start` runs anywhere; drop `next-on-pages`         | Yes            |
| `next-on-pages`  | Move to OpenNext Workers (when token constraint relaxes) | Yes            |
| Drizzle + Neon   | Already two-way per ADR 0001                             | Yes            |
| `nodejs_compat`  | Removable flag; Workers code is otherwise standard JS    | Yes            |

## Consequences

- Unblocks [BRI-6](#) and the auth-related parts of [BRI-5](#).
- Closes the static-export branch of conditional logic in
  `next.config.mjs` and removes the GitHub-Pages-specific deploy
  workflow `.github/workflows/deploy.yml`.
- Adds Cloudflare as a second vendor account holder. CEO owns the
  account; payment information is _not_ on file.
- Re-opens the supersession dance: ADR 0001 §4 was already superseded
  by ADR 0002, which is now superseded by this. The README and
  `docs/deployment.md` are updated to match.

## When to revisit

- The deprecated `@cloudflare/next-on-pages` stops getting security
  updates → migrate to OpenNext (and re-evaluate the deploy-token
  constraint).
- We need true production-grade observability that Cloudflare Pages
  free tier can't supply (e.g. log retention beyond CF's defaults).
- Compliance / region-pinning requirements appear.
- We outgrow the free-tier build minutes.
