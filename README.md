# Brilworks

Brilworks app shell. Pre-PMF. Ship boring.

## Stack

- Next.js 15 (App Router) + React 19 on Node 22
- TypeScript strict, ESLint (flat) + Prettier
- Vitest for unit/integration tests
- pnpm 10 as the package manager
- Postgres (Neon) + Drizzle, Auth.js, Sentry/Pino/Axiom — wired in follow-up tickets
- Vercel `iad1` for the web tier — wired in follow-up tickets

Full rationale: [docs/adr/0001-foundational-stack.md](docs/adr/0001-foundational-stack.md).

## Local dev

```bash
nvm use            # Node 22 (see .nvmrc)
corepack enable    # makes pnpm 10 available
pnpm install
pnpm dev           # http://localhost:3000
```

## Scripts

| Command            | What it does                          |
|--------------------|---------------------------------------|
| `pnpm dev`         | Next.js dev server                    |
| `pnpm build`       | Production build                      |
| `pnpm start`       | Run the production build              |
| `pnpm lint`        | ESLint (flat config)                  |
| `pnpm typecheck`   | `tsc --noEmit`                        |
| `pnpm test`        | Vitest, run once                      |
| `pnpm test:watch`  | Vitest, watch mode                    |
| `pnpm format`      | Prettier write                        |
| `pnpm format:check`| Prettier check (CI uses this)         |

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
- No secrets in the repo. Local secrets in `.env.local`. CI/staging/prod
  secrets in Vercel env.

## Deploy

Vercel `iad1`, auto-deploy on `main`, preview URL per PR. Hooked up in
[BRI-4](#).

## Where to look next

- ADR 0001: [docs/adr/0001-foundational-stack.md](docs/adr/0001-foundational-stack.md)
- CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
- Health check: `GET /api/health` → `{ "ok": true }`
