# Product Maturity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the full product-maturity target across the eight directions discussed with the user, while shipping the work in verified batches that keep the product usable at every step.

**Architecture:** Treat maturity work as a staged roadmap with an admin-visible maturity overview as the control surface. Each direction must eventually have backend evidence, operator UI, documentation, and tests. The first implementation added an admin-only system diagnostics contract; the second batch adds a product maturity overview so the eight directions remain visible while deeper features are built.

**Tech Stack:** pnpm monorepo, Cloudflare Workers, Hono, D1-backed settings, React 19, Vite, TypeScript, Vitest, Testing Library.

---

## Roadmap

### Phase 1: Operational Confidence

- Add admin diagnostics for environment, feature flags, secrets presence, mail domains, cookie/CORS posture, and integration readiness.
- Add delivery logs and retry/replay controls for Webhook and Telegram notification paths.
- Expand health checks from binary liveness to actionable readiness checks.
- Document release, incident, and configuration verification flows as operator checklists.

### Phase 2: Security And Governance

- Add session/device management, login history, and admin revoke controls.
- Split API keys into scoped permissions such as read mail, send mail, manage webhooks, and admin automation.
- Add invite policies for expiry, batch generation, target role, and redemption analytics.
- Expand audit views so admins can inspect risky operations without querying D1 manually.

### Phase 3: Mail Workflow Depth

- Improve search and filtering by sender, subject, date range, attachment presence, extraction type, and mailbox.
- Add batch actions for delete, archive, export, mark, and retention overrides.
- Add attachment preview, raw message view, and suspicious-link affordances in message detail.
- Surface retention countdowns and cleanup history per mailbox/message.

### Phase 4: Notification Rules And Integrations

- Add user/admin notification rules by mailbox, event, keyword, quiet hours, and target.
- Add Webhook delivery retry policy, signed payload docs, failed-delivery replay, and delivery drilldown.
- Add Slack, Discord, Feishu, and WeCom as optional notification targets after the rules engine exists.

### Phase 5: Plans, Quotas, And Teams

- Add plan tiers for mailbox count, retention days, API calls, webhook endpoints, and outbound quota.
- Add team workspaces with roles, shared mailboxes, audit log, and team-level usage.
- Add billing-ready quota summaries without coupling the first pass to a payment provider.

---

## Completion Definition For The Eight Directions

The goal is complete only when all of these directions have working product surfaces, backend support, tests, and documentation:

1. **Observability and operations:** global system diagnostics, recent errors, delivery logs, queue/backlog visibility, D1/R2 usage indicators, health checks, and alert hooks.
2. **Security and governance:** login history, session/device management, session revocation, scoped API keys, per-flow rate limits, invite expiry/batch/role policies, and audit views.
3. **Mail workflow depth:** advanced sender/subject/date/attachment/extraction filters, retention countdowns, raw message view, attachment preview, suspicious-link affordances, and batch operations.
4. **Notification rules and integrations:** rule engine by mailbox/event/keyword/quiet hours/target, signed Webhook documentation, delivery retry/replay, and extension points for Slack/Discord/Feishu/WeCom.
5. **Outbound maturity:** send quota UI, retry/failure/return-path visibility, sender identity management, templates, and SPF/DKIM/DMARC configuration checks.
6. **Commercial and permission model:** plan tiers, quota summaries, team workspaces, member roles, shared mailboxes, team usage, and organization-level audit logs.
7. **Docs and self-service troubleshooting:** scenario docs for independent domains, Telegram Bot, Email Routing, Resend, OAuth, common failures, plus in-product diagnostic guidance.
8. **Data reliability:** D1 migration management, backup/restore runbook, R2 cleanup observability, idempotent mail processing, duplicate notification prevention, and scheduled cleanup run records.

## Batch Status

| Batch | Scope | Status |
| --- | --- | --- |
| 1 | Admin system diagnostics for deployment readiness | Implemented |
| 2 | Admin product maturity overview for all eight directions | Implemented |
| 3 | Delivery/error operations center with recent failures and replay controls | Implemented |
| 4 | Security governance: scoped API keys | Implemented |
| 5 | Security governance: session devices, invite policy, audit view | Implemented |
| 6 | Mail workflow: advanced filters, retention countdown, batch operations | Implemented |
| 7 | Notification rules engine and integration expansion hooks | Implemented |
| 8 | Outbound maturity: identity checks, templates, DNS checks, retry UX | Implemented |
| 9 | Plans, teams, quotas, reliability logs, and backup/restore docs | Implemented |

---

## Implementation Batch: Delivery/Error Operations Center

### Completed In This Batch

- Added admin-only `GET /api/system/operations` for recent failure aggregation and operational signals.
- Aggregated deployment diagnostics, failed Webhook deliveries, failed Telegram audit events, outbound send failures, expired-message cleanup backlog, and D1/R2 binding status.
- Added a system settings「运维中心」rail showing overall status, compact signals, recent incidents, and direct handling links for Webhook, Telegram, and outbound records.
- Added Worker and Web tests for the operations endpoint, admin-only access, settings query wiring, route loading, and UI rendering.
- Updated API catalog, OpenAPI output, documentation site, and changelog entries.

---

## Implementation Batch: Security Governance Session Devices And Invite Policy

### Completed In This Batch

- Added session metadata storage for user agent, IP address, last seen time, and expiration.
- Added current-user session management endpoints:
  - `GET /api/profile/sessions`
  - `DELETE /api/profile/sessions/:sessionId`
  - `DELETE /api/profile/sessions/others`
- Added the personal settings security panel for active sessions, current-session markers, single-session revoke, and "退出其他设备".
- Added invite expiry and target-role policy storage, D1 migration, request validation, registration/OAuth enforcement, admin create controls, list display, expired status, and tests.
- Added audit events for session revocation and enriched invite creation.

### Completed Follow-Up In Batch 5

- Added login history with password/OAuth distinction, success/failure status, provider, IP, user-agent, and failure reason.
- Added admin governance summary endpoint and UI for recent login events, recent audit events, rate-limit policy visibility, and invite redemption statistics.
- Added batch invite generation with target role and expiry policy, plus admin UI controls and API docs.
- Added Worker and Web tests covering governance aggregation, batch invite creation, and admin panel rendering.

---

## Implementation Batch: Mail Workflow Depth

### Completed In This Batch

- Added advanced message filters for sender, subject, received date range, attachment presence, and extraction type across shared types, Worker parsing, D1 persistence, in-memory persistence, frontend query state, and tests.
- Added `POST /api/mail/messages/batch` for export and delete actions, including visibility checks, attachment cleanup on delete, audit events, API catalog, and OpenAPI docs.
- Added mailbox list batch-selection UI with current-page selection, selected-count feedback, delete action, and JSON export.
- Added message detail retention countdown, raw text section, attachment preview metadata, and suspicious-link checks for non-HTTPS or invalid extracted links.
- Added Worker integration tests and Web integration tests for advanced filters and batch actions.

---

## Implementation Batch: Notification Rules And Integration Hooks

### Completed In This Batch

- Added persisted notification rules with target, target ID, event types, mailbox filters, keyword matching, quiet hours, enabled state, D1 schema, migration, and in-memory/D1 store support.
- Added `GET/POST/PUT/DELETE /api/notification/rules` with audit records and API-key scope enforcement through `webhook:manage`.
- Applied notification rules before Webhook and Telegram delivery while preserving existing behavior when no rules are configured.
- Added Webhook page rule management UI for creating and deleting rules, including extension target options for Slack, Discord, Feishu, and WeCom.
- Kept Webhook signing, delivery logs, retry/replay controls, and payload inspection intact, and documented the new notification rule APIs.
- Added Worker integration coverage for rule-based Webhook suppression and Web tests for rule creation.

---

## Implementation Batch: Outbound Maturity

### Completed In This Batch

- Added `GET /api/mail/outbound/maturity` returning outbound quota, retry policy, failure stats, Return-Path status, sender identity checks, SPF/DKIM/DMARC checklist, and built-in send templates.
- Added the outbound page「发信成熟度」panel with quota, retry, Return-Path, identity, DNS, and template controls.
- Added template shortcuts that open the existing compose drawer with subject and body prefilled.
- Updated the maturity overview to reflect outbound readiness evidence and remaining follow-ups.
- Added Worker and Web tests covering the maturity API, page rendering, and template compose flow.

---

## Implementation Batch: Plans, Teams, Quotas, And Reliability

### Completed In This Batch

- Added `GET /api/users/commercial` for plan tiers, default organization workspace, member roles, shared mailbox usage, quota usage, and organization audit summaries.
- Added a users settings「套餐、团队与配额」panel for commercial model and team workspace visibility.
- Added cleanup run persistence with D1 migration `0017-cleanup-runs.sql`, in-memory/D1 store support, and scheduled cleanup success/failure recording.
- Added inbound idempotency for duplicate messages within a 5-minute window and suppressed duplicate Webhook/Telegram notifications.
- Added `GET /api/system/reliability` for D1/R2 status, migration evidence, cleanup runs, idempotency policy, and backup/restore runbook commands.
- Added a system settings「可靠性后台」panel and tests covering commercial summaries, cleanup records, reliability summaries, and duplicate inbound suppression.

---

## Implementation Batch: Phase 1 System Diagnostics

### Task 1: Add The Shared Diagnostics Contract And Worker Endpoint

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `apps/worker/src/modules/system/routes.ts`
- Test: `apps/worker/tests/app.test.ts`

**Step 1: Write the failing test**

Add a Worker test asserting an admin session can call `/api/system/diagnostics` and receive readiness checks:

```ts
const response = await app.request("/api/system/diagnostics", { headers: { cookie: adminCookie } }, {
  ...env,
  ENVIRONMENT: "production",
  COOKIE_SECURE: "false",
  CORS_ALLOWED_ORIGINS: "",
  TELEGRAM_BOT_TOKEN: "test-token",
  ENABLE_TELEGRAM: "true",
  ENABLE_OUTBOUND: "true"
});

const payload = await response.json() as {
  diagnostics: SystemDiagnosticsSummary;
};

expect(response.status).toBe(200);
expect(payload.diagnostics.overallStatus).toBe("error");
expect(payload.diagnostics.checks).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ id: "cookie.secure", status: "error" }),
    expect.objectContaining({ id: "cors.origins", status: "error" }),
    expect.objectContaining({ id: "telegram.webhook_secret", status: "error" })
  ])
);
```

Also add a member-session test returning `403`.

**Step 2: Run test to verify it fails**

Run:

```bash
./node_modules/.bin/vitest run apps/worker/tests/app.test.ts -t "system diagnostics"
```

Expected: FAIL because `/api/system/diagnostics` does not exist.

**Step 3: Write minimal implementation**

- Add shared types:
  - `SystemDiagnosticStatus = "ok" | "warning" | "error"`
  - `SystemDiagnosticCheck`
  - `SystemDiagnosticsSummary`
- In `apps/worker/src/modules/system/routes.ts`, add admin-only `GET /api/system/diagnostics`.
- Build checks from `resolveAppConfig(c.env)` and `getMailDomainSettingsUseCase(getAppServices(c), c.env)`.
- Suggested checks:
  - `runtime.environment`
  - `cookie.secure`
  - `cors.origins`
  - `mail.domains`
  - `outbound.resend`
  - `telegram.bot_token`
  - `telegram.webhook_secret`
  - `oauth.github`
  - `oauth.linuxdo`
- Compute `overallStatus`: `error` if any check is error, else `warning` if any warning, else `ok`.

**Step 4: Run test to verify it passes**

Run:

```bash
./node_modules/.bin/vitest run apps/worker/tests/app.test.ts -t "system diagnostics"
```

Expected: PASS.

**Step 5: Commit**

Do not commit automatically in this session unless the user asks for a commit.

### Task 2: Render Diagnostics In System Settings

**Files:**
- Modify: `apps/web/src/features/settings/api.ts`
- Modify: `apps/web/src/features/settings/queries.ts`
- Modify: `apps/web/src/features/settings/useSettingsData.ts`
- Modify: `apps/web/src/app/appStore.ts`
- Modify: `apps/web/src/app/AppRoutes.tsx`
- Modify: `apps/web/src/pages/SystemSettingsPage.tsx`
- Test: `apps/web/src/test/system-settings-page.test.tsx`
- Test: `apps/web/src/test/integration/system-settings-route.test.tsx`

**Step 1: Write the failing tests**

Add a component test that passes a diagnostics object and expects:

```ts
expect(screen.getByRole("heading", { name: "系统诊断" })).toBeInTheDocument();
expect(screen.getByText("需要处理")).toBeInTheDocument();
expect(screen.getByText("Cookie Secure 未开启")).toBeInTheDocument();
expect(screen.getByText("CORS 来源未配置")).toBeInTheDocument();
```

Update the route integration fetch mock so `/api/system/diagnostics` returns a summary for admins, then assert the System Settings route displays `系统诊断`.

**Step 2: Run test to verify it fails**

Run:

```bash
cd apps/web
../../node_modules/.bin/vitest run src/test/system-settings-page.test.tsx src/test/integration/system-settings-route.test.tsx
```

Expected: FAIL because diagnostics are not fetched or rendered.

**Step 3: Write minimal implementation**

- Add `fetchSystemDiagnostics()` to settings API.
- Extend `SettingsDataQueryOptions` with `includeSystemDiagnostics`.
- Fetch diagnostics only for admin runtime settings loads by default.
- Store diagnostics in `appStore` and pass them to `SystemSettingsPage`.
- Add a right-rail diagnostics card:
  - Overall status badge: `全部正常` / `有提醒` / `需要处理`
  - Rows for each check, showing status label and message.
  - Empty fallback when not admin or diagnostics are unavailable.

**Step 4: Run test to verify it passes**

Run:

```bash
cd apps/web
../../node_modules/.bin/vitest run src/test/system-settings-page.test.tsx src/test/integration/system-settings-route.test.tsx
```

Expected: PASS.

**Step 5: Commit**

Do not commit automatically in this session unless the user asks for a commit.

### Task 3: Document The Maturity Plan And Verify

**Files:**
- Create: `docs/plans/2026-06-28-product-maturity.md`
- Modify: `CHANGELOG.md`

**Step 1: Update documentation**

- Keep this plan as the source of truth for maturity roadmap sequencing.
- Add a `CHANGELOG.md` entry under `[Unreleased]` describing the new admin diagnostics surface.

**Step 2: Run focused verification**

Run:

```bash
./node_modules/.bin/vitest run apps/worker/tests/app.test.ts -t "system diagnostics"
(cd apps/web && ../../node_modules/.bin/vitest run src/test/system-settings-page.test.tsx src/test/integration/system-settings-route.test.tsx)
./node_modules/.bin/tsc -p apps/worker/tsconfig.json --noEmit
./node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit
git diff --check
```

Expected: all commands pass.

**Step 3: Final review**

- Confirm no unrelated files changed.
- Confirm the new diagnostics endpoint is admin-only.
- Confirm member users do not see an admin diagnostics panel.

---

## Implementation Batch: Product Maturity Overview

### Task 4: Add The Shared Maturity Contract And Worker Endpoint

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `apps/worker/src/modules/system/routes.ts`
- Test: `apps/worker/tests/app.test.ts`

**Steps:**

1. Add shared types for `ProductMaturitySummary`, `ProductMaturityArea`, `ProductMaturitySignal`, and the eight area IDs.
2. Add admin-only `GET /api/system/maturity`.
3. Build the maturity summary from current diagnostics, users, invites, API keys, mailboxes, messages, outbound history, Webhook delivery state, Telegram subscription state, and runtime bindings.
4. Return one area for each of the eight maturity directions with status, progress, evidence, signals, and next actions.
5. Add tests that admin sessions receive all eight areas and member sessions receive `403`.

### Task 5: Render Maturity Overview In System Settings

**Files:**
- Modify: `apps/web/src/features/settings/api.ts`
- Modify: `apps/web/src/features/settings/queries.ts`
- Modify: `apps/web/src/features/settings/useSettingsData.ts`
- Modify: `apps/web/src/app/appStore.ts`
- Modify: `apps/web/src/app/AppRoutes.tsx`
- Modify: `apps/web/src/pages/SystemSettingsPage.tsx`
- Test: `apps/web/src/test/system-settings-page.test.tsx`
- Test: `apps/web/src/test/integration/system-settings-route.test.tsx`

**Steps:**

1. Add `fetchSystemMaturity()` and include it in admin system settings data loading.
2. Store maturity state in the app store without overwriting it when unrelated settings refresh.
3. Pass the summary into `SystemSettingsPage`.
4. Render a compact admin-only “成熟度总览” panel with overall status, completed direction count, and eight direction rows.
5. Add component and route integration tests.

### Task 6: Document And Verify

**Files:**
- Modify: `apps/worker/src/modules/api-interface-catalog.mjs`
- Modify: `apps/worker/src/modules/integration-openapi.mjs`
- Modify: `apps/web/src/features/settings/api-interface-catalog.generated.ts`
- Create: `apps/docs/content/docs/product-maturity.mdx`
- Modify: `apps/docs/content/docs/meta.json`
- Modify: `CHANGELOG.md`

**Verification:**

```bash
node apps/worker/scripts/generate-api-interface-catalog.mjs
./node_modules/.bin/vitest run apps/worker/tests/app.test.ts -t "product maturity|system diagnostics"
(cd apps/web && ../../node_modules/.bin/vitest run src/test/system-settings-page.test.tsx src/test/integration/system-settings-route.test.tsx)
./node_modules/.bin/tsc -p apps/worker/tsconfig.json --noEmit
./node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit
git diff --check
```

---

## Implementation Batch: Scoped API Keys

### Task 7: Add Scope Storage And Enforcement

**Files:**
- Modify: `packages/shared/src/constants.ts`
- Modify: `packages/shared/src/types.ts`
- Modify: `apps/worker/src/core/bindings.ts`
- Modify: `apps/worker/src/infrastructure/db/schema.sql`
- Create: `apps/worker/src/infrastructure/db/migrations/0014-api-key-scopes.sql`
- Modify: `apps/worker/src/infrastructure/persistence/d1.ts`
- Modify: `apps/worker/src/infrastructure/persistence/in-memory.ts`
- Modify: `apps/worker/src/app/services/session-service.ts`
- Modify: `apps/worker/src/app/create-app.ts`

**Steps:**

1. Define stable API Key scopes and default legacy scopes.
2. Persist scopes as `scopes_json`, with existing keys falling back to default scopes.
3. Add API key auth context with the active key scopes.
4. Enforce scope requirements before API-key requests reach route handlers.

### Task 8: Add Scope Selection To The API Key UI

**Files:**
- Modify: `apps/web/src/features/settings/api.ts`
- Modify: `apps/web/src/features/settings/actions.ts`
- Modify: `apps/web/src/features/settings/useSettingsData.ts`
- Modify: `apps/web/src/app/AppRoutes.tsx`
- Modify: `apps/web/src/features/settings/ApiKeysPage.tsx`
- Modify: `apps/web/src/shared/styles/index.css`
- Test: `apps/web/src/test/integration/settings-page.test.tsx`

**Steps:**

1. Send selected scopes when creating a key.
2. Render scope checkboxes in the create dialog.
3. Show scope labels on each key row and in the one-time secret reveal.
4. Keep old default behavior by preselecting legacy scopes.

### Task 9: Document And Verify

**Files:**
- Modify: `apps/worker/src/modules/api-interface-catalog.mjs`
- Modify: `apps/worker/src/modules/integration-openapi.mjs`
- Modify: `apps/web/src/features/settings/api-interface-catalog.generated.ts`
- Modify: `docs/openapi.yaml`
- Modify: `CHANGELOG.md`

**Verification:**

```bash
node apps/worker/scripts/generate-api-interface-catalog.mjs
node apps/worker/scripts/generate-openapi.mjs
./node_modules/.bin/vitest run apps/worker/tests/integration/settings.integration.test.ts -t "api key"
(cd apps/web && ../../node_modules/.bin/vitest run src/test/integration/settings-page.test.tsx)
pnpm typecheck
pnpm lint
git diff --check
```
