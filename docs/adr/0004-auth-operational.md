# ADR 0004 — Auth operational addendum

- Status: Accepted
- Date: 2026-05-04
- Author: FoundingEngineer (acting CTO)
- Decider: CEO (delegated)
- Extends: [ADR 0001 §5 — Auth](./0001-foundational-stack.md#5-auth--authjs-nextauth-v5-with-drizzlepostgres-adapter)
- Depends on: [ADR 0003](./0003-staging-moves-to-cloudflare-pages.md) (server runtime)

## Context

[ADR 0001 §5](./0001-foundational-stack.md#5-auth--authjs-nextauth-v5-with-drizzlepostgres-adapter)
picked Auth.js v5 with the Drizzle/Postgres adapter, magic-link + Google,
and database sessions. It did **not** lock down the operational details:
which email transport, which OAuth provider as the second one, and the
session strategy at the framework layer. Those choices made themselves
load-bearing while wiring [BRI-6](#).

## Decisions

### 1. Session strategy: `database` (not JWT)

`session.strategy = "database"`. Sign-out actually invalidates the
session by deleting the row in `sessions`; replaying a captured cookie
after sign-out gets a 302 to `/signin` because the lookup misses.

A signed JWT would still validate post-sign-out (it doesn't know about
the deletion) — unacceptable for an auth scaffold the product team will
build on. Database sessions cost one extra DB round-trip per request,
which is fine at our scale and irrelevant on Neon's HTTP driver.

### 2. Email transport: Resend (not SMTP)

`Resend` provider, `RESEND_API_KEY` from env. One-line setup, free tier
covers 100/day, fetch-based so it works in Cloudflare's workerd runtime
(SMTP doesn't — we'd need a different HTTP-based provider regardless).

Rejected: Postmark, Mailgun, AWS SES — all viable, all add an account
holder for the same outcome.

### 3. Second provider: Google (not GitHub)

CEO is on Google Workspace. The acceptance criteria call for _CEO test
accounts_ signing in. GitHub OAuth would gate the test on having
GitHub accounts, which is wrong-shaped for product/board-level testers.

Magic link is provider-of-record; Google is the convenience option.

### 4. Split Auth.js config

Auth.js v5's middleware runs on the edge (workerd), where the
Drizzle adapter — which depends on `@neondatabase/serverless` —
_does_ work, but Auth.js docs recommend a split config so the adapter
isn't loaded in the middleware bundle. We follow the recommendation:

- `lib/auth.config.ts` — providers list (empty-by-default), pages,
  `authorized` callback, no adapter. Edge-safe.
- `lib/auth.ts` — full config with adapter and provider instances.
  Used by the route handler and server components.
- `middleware.ts` — `NextAuth(authConfig)` using only the edge-safe
  config.

If Auth.js drops this requirement in a later release, we can
collapse the two files.

## Trade-offs explicitly accepted

- DB sessions add DB load per request. Fine at our scale; revisit if
  the cost shows up in p95.
- Resend's free tier (100/day) is enough for staging + early prod.
  Will need a paid tier or alternative transport when we ship to a
  meaningful user count. Migration is a config swap.
- Google as the only OAuth provider locks early users into having a
  Google account. We accept this for the _scaffold_ phase; the
  product team can add GitHub / Microsoft / Apple by appending to the
  providers list — no schema change required.
