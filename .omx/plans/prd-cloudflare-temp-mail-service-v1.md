# PRD — Cloudflare Temp Mail Service v1

## Metadata
- **Slug:** cloudflare-temp-mail-service
- **Source spec:** `.omx/specs/deep-interview-cloudflare-temp-mail-service.md`
- **Context snapshot:** `.omx/context/cloudflare-temp-mail-service-20260408T023147Z.md`
- **Transcript:** `.omx/interviews/cloudflare-temp-mail-service-20260408T044826Z.md`
- **Planning mode:** `ralplan` consensus, deliberate mode
- **Status:** approved for execution handoff

## Evidence base
### Local reference evidence
- Reference Worker stack uses Hono/Wrangler with Resend, Telegraf, and Worker mail tooling: `.omx/reference/cloudflare_temp_email/worker/package.json:6-32`
- Reference Worker config surface shows D1, optional KV, AI binding, rate limiter, Telegram flags, and address/domain controls: `.omx/reference/cloudflare_temp_email/worker/wrangler.toml.template:25-172`
- Reference schema includes raw mail, addresses, outbound/sendbox, users, user bindings, roles, and passkeys: `.omx/reference/cloudflare_temp_email/db/schema.sql:1-121`
- Reference Worker centralizes `/api`, `/user_api`, `/admin`, `/telegram`, rate limiting, JWT checks, and asset serving in one entrypoint: `.omx/reference/cloudflare_temp_email/worker/src/worker.ts:20-220`
- Reference UI is tab-dense and feature-heavy, which is the baseline to improve rather than reproduce: `.omx/reference/cloudflare_temp_email/frontend/src/views/Index.vue:11-189`

### Official platform references
- Cloudflare Email Routing overview: https://developers.cloudflare.com/email-routing/
- Email Workers: https://developers.cloudflare.com/email-routing/email-workers/
- Email Routing limits: https://developers.cloudflare.com/email-routing/limits/
- Email Routing get started: https://developers.cloudflare.com/email-routing/get-started/
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Pages Functions pricing/limits relationship to Workers: https://developers.cloudflare.com/pages/functions/pricing/
- D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Send emails from Workers: https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/
- Workers TCP sockets: https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/
- Resend docs: https://resend.com/docs

## Problem statement
Build a public temporary email service that is self-controlled, Cloudflare-first, and visually modern, while avoiding the operational sprawl and unattractive UI of the reference project. The service should launch as an invite-only public product with account-bound mailbox ownership, strong abuse controls, and a realistic chance of staying inside Cloudflare free-tier envelopes for low-to-moderate usage.

## Why this exists
- The user wants a private, self-hosted Temp-Mail-like service rather than depending on third-party operators.
- The user wants Cloudflare as the primary stack and accepts **Resend as the only external exception**, only for outbound send.
- The user explicitly wants the frontend redesigned and the backend rewritten, not copied.

## Goals
1. Launch a usable v1 on Cloudflare Workers + Pages.
2. Keep the system public-facing but invite-only.
3. Support authenticated temporary mailbox creation and ownership.
4. Support receive/read mail, attachments, outbound send, AI extraction, Telegram notifications, API keys, and a minimal admin dashboard.
5. Keep v1 cost-bounded and operable by one person.

## Non-goals (v1)
- SMTP/IMAP proxy support
- OAuth login
- Multi-language support
- Complex permissions / role matrix
- Open signup
- Multi-tenant support

## External constraints and assumptions
1. **A Cloudflare-managed domain is required.** Email Routing works on a Cloudflare zone and needs MX/TXT records added to DNS. This PRD assumes the operator already controls a domain; Cloudflare free stack does not make domain acquisition free.
2. **Cloudflare Email Routing is inbound-first.** Cloudflare docs state Email Routing is for routing/processing inbound mail and Cloudflare does not provide a general SMTP server for outbound mail; Worker email sending is constrained to verified destinations. That is why Resend remains the approved outbound exception.
3. **Inbound size ceiling exists.** Cloudflare Email Routing currently does not support messages larger than 25 MiB.
4. **D1 cannot store arbitrary raw messages/attachments.** D1 row/blob size is capped at 2 MB, so large mail bodies and attachments must be bounded and split.
5. **Workers/Pages usage is shared.** Pages Functions requests count against Workers request limits; the free plan is not “infinite.”
6. **Workers AI is budgeted.** Free allocation is limited, so AI cannot be a required happy-path dependency for inbox correctness.
7. **R2 has a free tier, not infinite free storage.** Attachments must be capped and cleaned aggressively.

## Decision summary (ADR)
### Decision
Adopt a **Cloudflare-first modular monolith**:
- `apps/worker`: Hono-based Worker API + inbound email handler + cleanup + Telegram webhook/integration
- `apps/web`: React + TypeScript Cloudflare Pages SPA
- `packages/shared`: shared contracts, schemas, and DTOs
- Data on D1 + R2, AI on Workers AI, outbound send on Resend only

### Decision drivers
1. Near-zero-cost operation under free-tier limits
2. Clean v1 launch without SMTP/IMAP
3. Public-service abuse containment
4. Clear UI redesign path using React on Pages

### Alternatives considered
#### Option A — Cloudflare-first modular monolith on Worker + Pages **(chosen)**
**Pros**
- Best fit for requested Pages + React direction
- Keeps Worker focused on API/mail/integration budget
- Cleaner path to phase-2 SMTP/IMAP
- Avoids reproducing the full reference complexity

**Cons**
- Requires explicit cross-surface auth/session design
- Requires contract discipline across frontend/backend

#### Option B — Single Worker app serving UI + API
**Pros**
- Simpler same-origin auth story
- Fewer deploy surfaces

**Cons**
- Ties frontend iteration to Worker deployment
- Pushes UI delivery into the same request/CPU budget as email processing
- Less aligned with the explicit Pages + React preference

#### Option C — Structural port of the reference project
**Pros**
- Faster parity path
- Reuses many known capabilities

**Cons**
- Recreates complexity and UX density the user dislikes
- Weak simplification story for a greenfield v1

### Why chosen
Option A best balances the user’s explicit stack preference, the need for a true UI redesign, and the need to keep mail-processing logic small, modular, and cost-aware.

### Consequences
- Web auth must use a deliberate cookie/session model.
- Quotas, caps, and cleanup must be first-class design elements, not late hardening.
- Shared contracts must be created early to keep frontend/backend aligned.

### Follow-ups
- Plan phase-2 SMTP/IMAP only after v1 stabilizes.
- Revisit single-Worker delivery only if operational evidence shows it is clearly better.

## RALPLAN-DR summary
### Principles
1. **Cloudflare-first, cost-bounded operation**
2. **Invite-gated ownership over anonymity**
3. **Modular monolith before service sprawl**
4. **Deterministic-first extraction**
5. **Intentional UX over feature pile-up**

### Top decision drivers
1. Low operating cost under free-tier constraints
2. Launchable v1 without SMTP/IMAP
3. Abuse containment for a public-facing service with outbound mail

### Steelman antithesis and answer
**Antithesis:** a single Worker app could simplify auth and deployment.

**Answer:** the heavier operational pressure in this project is not deployment count; it is keeping the Worker budget focused on mail processing and integrations while enabling fast, cache-friendly frontend iteration. Pages + Worker separation better matches the requested React redesign and keeps the Worker lean.

## Product scope
### User-facing v1 features
- Invite-only registration and login
- Authenticated mailbox creation and ownership
- Inbox list and message detail views
- Attachment viewing/downloading for accepted attachments
- Outbound send from UI and core API
- Important-info extraction from inbound mail
- Telegram notification setup and delivery
- API key create/list/revoke for user-core APIs

### Admin-facing v1 features
- User list/overview
- Invite code create/revoke/disable
- Quota controls
- Mailbox oversight
- Feature toggles / kill-switches

### Explicitly out of scope in admin v1
- Generic config editor
- OAuth settings
- role matrix / ACL system
- multi-tenant controls

## Operating envelope (binding for v1)
- **Mailbox cap per user:** 5 active mailboxes
- **Message retention:** 7 days
- **Attachment retention:** 7 days, tied to message expiry
- **Accepted attachment size:** up to 10 MiB per attachment
- **Total stored attachments per message:** up to 15 MiB
- **Oversize policy:** reject or truncate payload storage above app-level caps; store minimal status metadata when possible
- **Outbound send quota:** 20 sends/day/user, burst-limited
- **AI quota rule:** deterministic extraction on all eligible mail; Workers AI only when deterministic extraction finds nothing and per-user daily AI budget remains
- **Render rule:** AI and Telegram side effects must never block inbox/message rendering

## Security and abuse baseline
- Invite-only registration
- Session-authenticated mailbox creation only
- Worker-issued **HTTP-only session cookie** for web auth
- **Hashed API keys** for programmatic access only
- API keys are never valid on admin routes or session-auth routes
- Route rate limits for register/login/mailbox create/send/API-key create
- Audit events for invite use, mailbox changes, sends, API-key lifecycle, admin actions
- Kill-switches for outbound send, mailbox creation, and invite pool activity

## Proposed architecture
### Runtime topology
#### `apps/worker`
Responsibilities:
- Hono router
- auth/session middleware
- admin middleware
- API-key middleware
- inbound email handler
- scheduled cleanup
- Telegram webhook endpoints
- outbound send orchestration
- extraction orchestration

Suggested layout:
```text
apps/worker/
  src/
    index.ts
    bindings.ts
    middleware/
      session.ts
      admin.ts
      apiKey.ts
      rateLimit.ts
      errors.ts
    routes/
      health.ts
      auth.ts
      invites.ts
      mailboxes.ts
      messages.ts
      attachments.ts
      outbound.ts
      telegram.ts
      admin.ts
      apiKeys.ts
    services/
      invite-service.ts
      session-service.ts
      mailbox-service.ts
      inbound-mail-service.ts
      message-store-service.ts
      attachment-service.ts
      outbound-mail-service.ts
      extract-service.ts
      telegram-service.ts
      api-key-service.ts
      quota-service.ts
      cleanup-service.ts
      audit-service.ts
    db/
      schema.sql
      migrations/
    tests/
      unit/
      integration/
```

#### `apps/web`
Responsibilities:
- React + TypeScript SPA on Pages
- auth views
- inbox/message experience
- settings/API key/Telegram UI
- admin dashboard

Suggested layout:
```text
apps/web/
  src/
    routes/
      auth/
      inbox/
      settings/
      admin/
    features/
      auth/
      mailboxes/
      messages/
      attachments/
      outbound/
      telegram/
      apiKeys/
      admin/
    tests/
      unit/
      e2e/
```

#### `packages/shared`
Responsibilities:
- request/response contracts
- validation schemas
- auth/mail/admin domain types
- shared constants for v1 limits

### Data plane
#### D1
Tables to include:
- `users`
- `invite_codes`
- `mailboxes`
- `messages`
- `outbound_messages`
- `api_keys`
- `telegram_subscriptions`
- `send_quotas`
- `settings`
- `audit_events`

#### R2
- accepted attachment blobs
- optional bounded overflow artifacts only if strictly necessary

#### Workers AI
- fallback extraction only

#### Resend
- outbound send only

### Message persistence policy
- Store **message metadata** in D1.
- Store **bounded normalized preview text/html** in D1 only when it remains safely under row-size limits.
- Store accepted attachments in R2.
- Reject or truncate oversized payloads instead of attempting full fidelity persistence.
- Do not design around storing large raw message blobs in D1.

### API surface direction
- `/auth/*` — register/login/logout/session
- `/api/mailboxes/*` — create/list/delete owned mailboxes
- `/api/messages/*` — inbox, message detail, extraction result
- `/api/outbound/*` — send and sent history/status
- `/api/telegram/*` — bind/configure notifications
- `/api/keys/*` — create/revoke/list API keys
- `/admin/*` — users, invites, quotas, mailbox oversight, feature toggles
- `/hooks/telegram/*` — Telegram ingress/webhook

### UI direction
- Two-pane inbox on desktop
- Stacked responsive layout on mobile
- Primary actions obvious: create mailbox, refresh, send, copy extracted code/link
- Settings separated from inbox
- Admin on a separate route group
- Avoid the reference app’s tab-heavy shell and over-dense control surface

## Extraction strategy
1. Deterministic parser first: regex + link extraction + priority heuristics
2. Workers AI fallback only if deterministic pass yields no useful result and budget remains
3. Persist extraction method (`regex`, `ai`, `none`)
4. Never block inbox render on extraction outcome

## Operations hardening — mandatory before launch
- scheduled cleanup cron
- route rate limiting
- audit events
- abuse kill-switches
- health endpoint
- structured logs
- bounded feature flags for AI and Telegram
- cleanup drift visibility in admin/operator surfaces

## Delivery phases
### Phase 1 — Scaffold, limits, and shared contracts
- create monorepo structure
- add workspace config/scripts
- define shared DTOs/schemas/constants
- add Worker/Pages deployment stubs

### Phase 2 — Auth, invites, sessions, admin bootstrap
- implement D1 schema + migrations
- invite issuance/redeem flow
- worker-issued HTTP-only session auth
- first-admin bootstrap path
- explicit admin/session separation from API-key auth

### Phase 3 — Mailbox model, rate limits, abuse controls
- mailbox ownership and 5-mailbox cap
- rate-limit middleware
- audit events
- kill-switch plumbing
- quota model and admin quota controls

### Phase 4 — Inbound mail, persistence, attachments, cleanup
- inbound handler
- bounded D1 persistence
- R2 attachment storage for accepted attachments
- oversize rejection/truncation path
- cleanup metadata and scheduled deletion

### Phase 5 — Frontend inbox/admin redesign
- auth flows
- mailbox/inbox/detail flows
- settings/API key/Telegram UX
- minimal admin views
- responsive quality review

### Phase 6 — Outbound, extraction, Telegram
- Resend integration with quotas
- deterministic extraction + AI fallback
- Telegram binding/notification delivery
- side effects remain best-effort

### Phase 7 — Hardening and release verification
- CI
- staging deployment wiring
- integration/e2e/staging smoke
- verify operating-envelope enforcement paths

## Deliberate-mode pre-mortem
### 1) Oversized email/attachment blows storage/parsing budget
Mitigation:
- app-level caps below routing ceiling
- bounded D1 persistence
- R2 only for accepted attachments
- explicit oversize rejection path with status telemetry

### 2) D1/R2 cleanup drift breaks temporary semantics
Mitigation:
- paired deletion logic
- expiry metadata on both logical message and blob storage
- drift counters and backlog visibility

### 3) API-key leakage or replay causes silent abuse
Mitigation:
- keys shown once
- stored hashed
- scoped to user-core endpoints only
- revocable
- audited and rate-limited
- rejected from admin/session routes

## Risks and mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| outbound abuse | quota burn / external-cost risk | invite-only signup, quotas, rate limits, kill-switches, audit logs |
| attachment sprawl | R2/storage overrun | strict caps, TTL cleanup, oversize rejection |
| D1 row/query pressure | failed requests / poor fit | bounded preview persistence, query-efficient handlers |
| AI budget exhaustion | degraded extraction | deterministic-first, AI fallback, graceful failure |
| API-key misuse | data exposure / abuse | scoped hashed keys, revoke path, admin-route rejection |
| UI quality drift | misses explicit user goal | treat design quality as acceptance criterion |

## Verification plan
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test --filter worker`
- `pnpm test --filter web`
- `pnpm build`
- integration tests against local/staging D1/R2 bindings
- e2e for invite signup, mailbox create, inbox, send, API keys, admin
- manual staging smoke for inbound, attachments, oversize handling, send, extraction fallback, Telegram failure isolation, cleanup drift

## Available-agent-types roster
- `executor`
- `architect`
- `test-engineer`
- `verifier`
- `security-reviewer`
- `explore`
- `writer`

## Follow-up staffing guidance
### Ralph path
- implementation owner: `executor` (**high**)
- auth/schema checkpoint: `architect` (**high**)
- auth/API-key/admin review: `security-reviewer` (**medium**)
- QA pass: `test-engineer` (**medium**)
- final evidence gate: `verifier` (**high**)

Launch hint:
```text
$ralph .omx/plans/prd-cloudflare-temp-mail-service-v1.md
```

### Team path
Use 4 executor lanes:
1. backend/auth/session/data (**high**)
2. inbound/outbound/integrations (**high**)
3. frontend/design/admin (**medium**)
4. test/verification/hardening (**medium**)

Launch hints:
```text
$team 4:executor "Implement .omx/plans/prd-cloudflare-temp-mail-service-v1.md and verify against .omx/plans/test-spec-cloudflare-temp-mail-service-v1.md"
```

```text
omx team 4:executor "Implement .omx/plans/prd-cloudflare-temp-mail-service-v1.md and verify against .omx/plans/test-spec-cloudflare-temp-mail-service-v1.md"
```

## Team verification path
1. Verification lane owns the evidence log from day one.
2. Backend lane proves session auth, API-key separation, quotas, cleanup, and persistence policy.
3. Integration lane proves inbound/outbound behavior, extraction fallback, Telegram fallback, and oversize handling.
4. Frontend lane proves responsive inbox/admin/API-key flows.
5. Final verifier checks each acceptance criterion against the test spec before execution handoff is considered complete.
