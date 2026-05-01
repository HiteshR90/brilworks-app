# ADR 0001 — Foundational Stack

- Status: Accepted
- Date: 2026-05-01
- Author: FoundingEngineer (acting CTO)
- Decider: CEO (delegated)

## Context

Brilworks is pre-PMF and pre-engineer-#2. Every other foundational ticket
(repo+CI, deploy, observability, auth) is blocked until the stack is fixed.
We optimize for speed of learning and two-way-door choices (revertible in
under a week). No vendor lock-in we cannot escape with `pg_dump` + a
container.

## Decisions

### 1. Frontend / SSR — Next.js 15 (App Router) on React 19
- **Alternatives considered:** SvelteKit (smaller talent pool, fewer libs),
  Remix/React Router 7 (fine, but smaller ecosystem and a moving target post
  merge), Vite + plain React (loses SSR/SEO out of the box).
- **Why:** Boring default with the largest hireable pool. One framework covers
  SSR/SSG/CSR/Route Handlers. Two-way door: `next build && next start` runs
  on any container host if we leave Vercel.

### 2. Backend language + runtime — TypeScript on Node 22 LTS, starting in Next.js Route Handlers
- **Alternatives considered:** Go (more boilerplate; splits language stack;
  premature given one engineer), Python/FastAPI (separate runtime + ORM),
  Bun (fast but immature in prod for our needs).
- **Why:** One language end-to-end → max small-team velocity. Extract a
  standalone Fastify service only when we have a real long-running need
  (background jobs, websockets, heavy CPU).

### 3. Database — Managed PostgreSQL (Neon) + Drizzle ORM
- **Alternatives considered:** Supabase Postgres (bundles Auth/Storage we are
  not committing to), AWS RDS (slow to provision, ops tax), MySQL (no win
  for us), Mongo/Dynamo (no relational guarantees we will want later).
- **Why:** Postgres is the most defensible, most portable database in
  existence. Neon is *standard* Postgres with branching for preview envs;
  `pg_dump` exits in an afternoon. Drizzle is a thin, SQL-first ORM so
  swapping providers — or ORMs — is mechanical.
- **Analytics:** stays in the same Postgres until traffic forces ClickHouse
  or Tinybird. Do not pre-architect.

### 4. Deployment target — Vercel for the web tier, region `iad1` (us-east-1)
- **Alternatives considered:** Fly.io (great but more ops), AWS ECS/Fargate
  (too much yak before any user), Render (fine, smaller ecosystem),
  Cloudflare Workers (runtime constraints conflict with Node libs we need).
- **Why:** Zero-ops Next.js host, per-PR preview URLs, instant rollback.
  Two-way door because the same app runs on any container. When a worker
  service appears, host it on Fly.io or Render and keep Vercel as web only.
- **Region:** start single-region us-east; add EU only when a customer
  demands.

### 5. Auth — Auth.js (NextAuth v5) with Drizzle/Postgres adapter
- **Alternatives considered:** Clerk (excellent DX but owns user identities;
  re-hosting passwords/MFA is more than a week of work at scale), Supabase
  Auth (couples us to Supabase), WorkOS (B2B-heavy, premature), rolling our
  own (no).
- **Why:** Open source, user records live in *our* Postgres, magic-link +
  Google to start. Sessions in DB (not raw JWTs) so we can revoke. Migrating
  off is a SQL export.

### 6. Observability — Sentry (errors) + Pino (structured logs) + Axiom (log aggregation)
- **Alternatives considered:** Datadog (overkill + expensive pre-revenue),
  BetterStack/Logtail (fine), New Relic (heavy), DIY (no).
- **Why:** Sentry is the de-facto standard for app errors; Pino emits
  JSON-to-stdout that any host can ingest; Axiom is cheap, fast, and
  exportable. Defer metrics + distributed tracing until we have a service
  that warrants them — premature otherwise.

### 7. Package manager + monorepo posture — pnpm, single repo, **single Next.js app, no workspaces**
- **Alternatives considered:** npm/yarn (slower, looser), Turborepo from day
  one (premature: one app does not need it), Nx (heavyweight).
- **Why:** pnpm is the fastest, strictest, and most disk-efficient option;
  it catches phantom deps. Splitting into workspaces is a 30-minute
  migration when we add a second deployable. Doing it now is yak.

## Cross-cutting defaults

- Node 22 LTS, TypeScript `strict: true`, ESLint + Prettier (flat config).
- Tests: Vitest (unit/integration), Playwright (E2E). 80% coverage target.
- Env: `.env.local` for dev, Vercel env vars per environment. Doppler later
  if it hurts.
- Secrets: never in repo; gitleaks runs in CI on every push/PR.
- CI: GitHub Actions (lint + typecheck + test + build on PR).
- Feature flags: `NEXT_PUBLIC_FEATURE_*` env vars to start; revisit a real
  flag service once we have ≥5 flags.

## Two-way-door audit

| Decision  | Cost to reverse                                    | Within a week? |
|-----------|----------------------------------------------------|----------------|
| Next.js   | Re-platform pages, keep API; or `next start` host  | Yes            |
| Node/TS   | Rewrite per service, not the whole app             | Yes (per svc)  |
| Postgres  | `pg_dump` + restore on any provider                | Yes            |
| Vercel    | Containerize and run `next start` on Fly/Render    | Yes            |
| Auth.js   | Users + sessions in our Postgres; export SQL       | Yes            |
| Sentry    | Drop SDK; logs already independent in Axiom        | Yes            |
| Axiom     | Logs are JSON; redirect Pino transport             | Yes            |
| pnpm      | `pnpm import` from npm, or just regenerate lock    | Yes            |

All eight are reversible inside a week today. Re-audit at each architectural
review when a decision becomes load-bearing.

## Out of scope (for now)

- Microservices, k8s, service mesh.
- Self-hosted Postgres, log shipping infra, Grafana stack.
- Multi-region, multi-tenant DB sharding.
- A native mobile app.

We will revisit when traffic, team size, or compliance demand it — not before.

## Consequences

- Unblocks the rest of the foundational tickets.
- Locks the org into a TypeScript-first hire profile until we add a backend
  service in another language. Acceptable at this size.
- Any deviation from this ADR (different framework, different DB, leaving
  Vercel) requires a follow-up ADR superseding this one.
