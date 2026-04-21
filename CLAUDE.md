# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development verification (run before committing)
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# Local D1 bootstrap (required before first Worker run / integration tests)
pnpm db:init:worker

# Targeted test runs
pnpm test:worker          # Worker unit tests only
pnpm test:web             # Web unit tests only
pnpm test:shared          # Shared package tests only
pnpm test:worker:integration   # Worker integration tests
pnpm test:web:integration      # Web integration tests
pnpm test:e2e             # Playwright E2E tests (requires preview server)
pnpm test:e2e:install     # Install Playwright Chromium browser

# Run a single test file
pnpm --dir apps/worker exec vitest run tests/path/to/file.test.ts
pnpm --dir apps/web exec vitest run src/path/to/file.test.ts
```

`pnpm lint|typecheck|test|build` all route through `scripts/run-task.mjs`, which
fans out to each workspace package. Append `--filter <shared|worker|web>` to
scope a task (e.g., `pnpm test --filter worker`). The `build` target for the
Worker is `wrangler deploy --dry-run`, not a bundler.

## Architecture

This is a **pnpm monorepo** for a disposable email service:

```
apps/web/      # React 19 + Vite frontend
apps/worker/   # Cloudflare Worker backend (Hono framework)
packages/shared/  # Shared types, constants, pure functions only
```

### Worker runtime entry points (`apps/worker/src/index.ts`)

The Worker exposes three independent triggers — every change must consider all
three if it touches shared state:

| Handler | Trigger | Purpose |
|---|---|---|
| `fetch` | HTTP requests | Hono app created via `createApp()` in `app/create-app.ts` |
| `email` | Cloudflare Email Routing inbound | `processInboundEmail()` parses and stores incoming mail |
| `scheduled` | Cron Trigger | `runCleanup()` expires old messages/sessions |

All three resolve bindings through the same `AppBindings` (see `core/bindings.ts`)
and persist through a D1 store constructed by `infrastructure/persistence/d1`.

### Frontend layers (`apps/web/src/`)

| Layer | Purpose |
|---|---|
| `app/` | Bootstrap, routing, global state orchestration |
| `pages/` | Page-level composition only — no direct fetch logic |
| `features/` | Business domains: `auth`, `inbox`, `settings`, `admin`, `accounts`, `announcements`, `dashboard`, `landing`, `outbound` |
| `shared/` | API client, styles, hooks, UI primitives — no business logic |
| `test/` | Test setup and integration tests |

Dependency direction: `app → pages → features → shared`. Pages must not depend on other pages.

### Backend layers (`apps/worker/src/`)

| Layer | Purpose |
|---|---|
| `app/` | Route registration, request/response mapping, use case orchestration (`routes/`, `use-cases/`, `services/`, `mappers/`) |
| `core/` | Type contracts, Cloudflare bindings, context definitions — no implementations |
| `infrastructure/` | D1 database, R2 storage, external service integrations |
| `shared/` | Email parsing (postal-mime), security utilities, pure helpers |

Dependency direction: `app → core/infrastructure/shared`. Infrastructure must not depend on `app/`.

### Shared package (`packages/shared/`)

Only allowed: shared types, constants, pure functions with no side effects.
Not allowed: DOM operations, Cloudflare bindings, database logic, runtime-specific code.

## Key Conventions

**Naming:**
- Files: `kebab-case.ts` for TS/Worker files, `PascalCase.tsx` for React components
- Variables/functions: `camelCase` with semantic names (`refreshSession`, not `data`)
- Types/interfaces: `PascalCase` reflecting boundary and role
- Booleans: `is`, `has`, `can`, `should` prefixes
- Event handlers: `handleXxx`
- Directories: `kebab-case`; no semantic-free names like `misc`, `common2`, `temp`

**Code style:**
- 2-space indentation, double quotes, LF line endings, UTF-8 (no BOM)
- Import order: third-party → workspace packages (`@wemail/shared`) → relative paths
- Comments explain *why*, not *what*; required for platform constraints, security logic, counter-intuitive implementations

**Testing:**
- Unit tests for pure functions; integration tests for routes/services; E2E for critical page flows
- Test names describe behavior: `"requires a valid invite for registration"`, not `"test 1"`
- Frontend tests in `src/test/`; Worker tests in `tests/`

**Architecture enforcement:**
- If a file's correct location is unclear, clarify the boundary in a README before writing code
- Every key directory has a `README.md` — update it when restructuring
- Route handlers: receive params, check auth, call use case, return response — no business logic inline
- All API calls from frontend go through `shared/api/`

**Branching & commits:**
- Never develop long-running work on `main`; use `feature/<topic>`, `fix/<topic>`, `refactor/<topic>`, `docs/<topic>`
- Commits follow the Lore Commit Protocol: first line answers *why*; body covers constraints/tradeoffs; trailers record verification, risks, and rejected alternatives
- Structural changes must also update the relevant README / `docs/`

## Runtime Context

- Backend runs on **Cloudflare Workers** (not Node.js) — no Node built-ins, use Web APIs. `nodejs_compat` flag is on, but prefer Web APIs
- Database: **D1** (SQLite-compatible), Object storage: **R2**
- Email inbound processing via Cloudflare Email Routing
- Scheduled cleanup tasks via Cloudflare Cron Triggers
- Deploy environments are split in `apps/worker/wrangler.toml`: `default` (local), `env.staging`, `env.production` — each points at its own D1 instance and vars
- Feature flags live in wrangler vars (`ENABLE_AI`, `ENABLE_TELEGRAM`, `ENABLE_OUTBOUND`, `ENABLE_MAILBOX_CREATION`) and gate code paths; honor them when adding new behavior

## Authoritative Docs

When this file and `docs/` disagree, `docs/` wins (it is the source of truth
for project-level process). Consult these when a task touches the relevant area:

- `docs/code-standard.md` — layering boundaries and naming rules
- `docs/development-workflow.md` — branch, review, commit, verification flow
- `docs/testing-strategy.md` — layered test expectations and CI mapping
- `docs/deploy-runbook.md` — release, deploy, rollback
- `docs/architecture/` — layered architecture deep-dive
- `docs/adr/` — accepted architecture decisions
- `docs/api-guide.md` + `docs/openapi.yaml` — HTTP surface
