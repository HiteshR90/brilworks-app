# Brilworks

Brilworks app shell. Pre-PMF. Ship boring.

## Stack

- Next.js 15 (App Router) + React 19 on Node 22
- TypeScript strict, ESLint (flat) + Prettier
- Vitest for unit/integration tests
- pnpm 10 as the package manager
- Postgres (Neon) + Drizzle ORM
- Auth.js v5 (database sessions, magic link via Resend + Google OAuth)
- Sentry / Pino / Axiom for observability
- Cloudflare Pages (SSR via `@cloudflare/next-on-pages`) for staging,
  deployed from `main` via Cloudflare's GitHub OAuth integration
  (no stored deploy token in CI)

Full rationale: [docs/adr/0001-foundational-stack.md](docs/adr/0001-foundational-stack.md), with the deploy-target supersessions in [docs/adr/0002-staging-uses-github-pages.md](docs/adr/0002-staging-uses-github-pages.md) → [docs/adr/0003-staging-moves-to-cloudflare-pages.md](docs/adr/0003-staging-moves-to-cloudflare-pages.md), and the auth operational details in [docs/adr/0004-auth-operational.md](docs/adr/0004-auth-operational.md).

## Local dev

```bash
nvm use            # Node 22 (see .nvmrc)
corepack enable    # makes pnpm 10 available
pnpm install
pnpm dev           # http://localhost:3000
```

## Scripts

| Command             | What it does                                               |
| ------------------- | ---------------------------------------------------------- |
| `pnpm dev`          | Next.js dev server                                         |
| `pnpm build`        | Production build                                           |
| `pnpm start`        | Run the production build                                   |
| `pnpm lint`         | ESLint (flat config)                                       |
| `pnpm typecheck`    | `tsc --noEmit`                                             |
| `pnpm test`         | Vitest, run once                                           |
| `pnpm test:watch`   | Vitest, watch mode                                         |
| `pnpm format`       | Prettier write                                             |
| `pnpm format:check` | Prettier check (CI uses this)                              |
| `pnpm db:generate`  | Drizzle: generate a new migration from the schema diff     |
| `pnpm db:migrate`   | Drizzle: apply pending migrations against `DATABASE_URL`   |
| `pnpm pages:build`  | Build for Cloudflare Pages via `@cloudflare/next-on-pages` |
| `pnpm pages:dev`    | Run the Pages build locally with Wrangler                  |

## CI

Every push and PR runs `lint`, `typecheck`, `test`, `build`, plus a gitleaks
secret scan. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
`main` is protected: PRs must be CI-green to merge.

## Repo conventions

- Single Next.js app at the root. No workspaces yet — add when we have a
  second deployable.
- Source layout: `app/` (routes/pages), `lib/` (shared TS), `docs/adr/`
  (decisions). New tests live next to the code as `*.test.ts(x)`.
- Commits: short imperative subject. Trunk-based — branch off `main`,
  open a PR, merge when CI is green.
- No secrets in the repo. Local secrets in `.env.local`. Staging runtime
  secrets in Cloudflare Pages env vars (the build runs on Cloudflare's infra,
  not GitHub Actions, so secrets are not stored in GitHub).

## Deploy

Cloudflare Pages, auto-deploy on `main` via Cloudflare's GitHub OAuth
integration — no `CLOUDFLARE_API_TOKEN` is stored in CI. Build/deploy steps
and the one-time CF Pages dashboard setup live in
[docs/deployment.md](docs/deployment.md).

## Where to look next

- ADR 0001 (stack): [docs/adr/0001-foundational-stack.md](docs/adr/0001-foundational-stack.md)
- ADR 0002 (GitHub Pages staging — superseded): [docs/adr/0002-staging-uses-github-pages.md](docs/adr/0002-staging-uses-github-pages.md)
- ADR 0003 (Cloudflare Pages staging): [docs/adr/0003-staging-moves-to-cloudflare-pages.md](docs/adr/0003-staging-moves-to-cloudflare-pages.md)
- ADR 0004 (auth operational): [docs/adr/0004-auth-operational.md](docs/adr/0004-auth-operational.md)
- Deployment: [docs/deployment.md](docs/deployment.md)
- Observability: [docs/observability.md](docs/observability.md) — 30-second "is staging healthy?" runbook lives at the top
- CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
- Uptime synthetic: [`.github/workflows/uptime.yml`](.github/workflows/uptime.yml)
- Health: `GET /api/health` → static JSON with the deploy's commit SHA + run id
- Auth: `app/signin/page.tsx`, `app/hello/page.tsx`, `app/api/auth/[...nextauth]/route.ts`, `lib/auth.ts`, `lib/auth.config.ts`, `middleware.ts`
