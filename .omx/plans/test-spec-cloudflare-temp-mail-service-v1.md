# Test Spec — Cloudflare Temp Mail Service v1

## Metadata
- **Slug:** cloudflare-temp-mail-service
- **Companion PRD:** `.omx/plans/prd-cloudflare-temp-mail-service-v1.md`
- **Source spec:** `.omx/specs/deep-interview-cloudflare-temp-mail-service.md`
- **Planning mode:** `ralplan` deliberate consensus

## System under test
A Cloudflare-first temporary email service with:
- Worker API and inbound email handler
- React Pages frontend
- D1 + R2 storage
- Resend outbound integration
- Workers AI fallback extraction
- Telegram notifications
- invite-only registration
- session-authenticated mailbox ownership
- user API keys
- minimal admin dashboard

## Execution assumptions
- Operator controls a Cloudflare-managed domain/zone.
- Email Routing is enabled for the chosen inbound domain/subdomain.
- Worker, Pages, D1, and R2 bindings exist in staging.
- Resend is configured only for outbound send.
- Telegram bot token and webhook are configured in staging when Telegram cases are run.

## Acceptance criteria matrix
| ID | Requirement | Verification type |
| --- | --- | --- |
| AC-01 | Registration requires a valid invite code | integration + e2e |
| AC-02 | Web auth uses Worker-issued HTTP-only session cookies | integration + e2e |
| AC-03 | API keys work only on user-core endpoints and fail on admin/session routes | integration + e2e |
| AC-04 | Only authenticated invited users can create/use temp mailboxes | integration + e2e |
| AC-05 | Mailbox cap per user is enforced | unit + integration + e2e |
| AC-06 | Users can receive mail and read inbox/message detail in the web UI | integration + e2e |
| AC-07 | Oversized messages/attachments are rejected or truncated without breaking inbox rendering | integration + e2e |
| AC-08 | Users can view/download accepted attachments | integration + e2e |
| AC-09 | Users can send outbound mail until quota is exhausted; exhaustion is visible and enforced | integration + e2e |
| AC-10 | Extraction returns useful codes/links when available and degrades gracefully when AI is unavailable | unit + integration + e2e |
| AC-11 | Telegram notification setup works and Telegram failure does not block inbox correctness | integration + e2e |
| AC-12 | Admin can manage users, invites, quotas, mailbox oversight, and feature toggles only | integration + e2e |
| AC-13 | Cleanup removes expired D1 metadata and R2 blobs | integration + observability + manual |
| AC-14 | UI is materially cleaner and more modern than the reference implementation | manual + visual review |

## Test levels
### Unit tests
#### Auth / access
- invite code validation and redemption
- session cookie issuance, validation, expiry, logout invalidation
- API-key hashing, prefix matching, revoke behavior
- explicit rejection of API key on admin/session-only routes

#### Limits / abuse
- mailbox cap enforcement at 5 active mailboxes
- outbound quota calculations and exhaustion behavior
- burst throttling helper logic
- feature-toggle and kill-switch evaluation

#### Mail processing
- deterministic extraction (codes, links, priorities)
- AI fallback eligibility gating
- oversize payload classification
- bounded preview truncation rules
- cleanup eligibility calculations

### Integration tests
#### Auth and ownership
- register with valid invite succeeds
- register with invalid/revoked invite fails
- anonymous mailbox create fails
- authenticated mailbox create succeeds
- mailbox access is limited to owner

#### API-key separation
- API key can access allowed user-core endpoints
- API key cannot call admin routes
- API key cannot call session-auth bootstrap routes
- revoked API key stops working immediately

#### Inbound mail and storage
- inbound email persists message metadata and preview
- accepted attachment persists to R2 with linked metadata
- oversized attachment triggers reject/truncate path
- oversize handling preserves inbox stability and visible status

#### Outbound send
- send succeeds through Resend when under quota
- send fails visibly when quota exhausted
- admin-disabled sender cannot send
- audit event recorded for send attempts

#### Extraction and Telegram
- regex extraction succeeds without AI
- AI-disabled path degrades gracefully
- AI-error path degrades gracefully
- Telegram-configured path sends notification
- Telegram-failure path leaves inbox/message correctness intact

#### Cleanup
- expired message cleanup removes D1 metadata and linked R2 blobs
- cleanup drift is recorded/observable when deletion partially fails
- cleanup respects retention window

## End-to-end flows
### E2E-01 Invite registration and mailbox creation
1. Start as unauthenticated user.
2. Attempt mailbox creation -> must fail.
3. Register with valid invite.
4. Confirm session established via cookie-backed web flow.
5. Create first mailbox.
6. Repeat until cap reached; 6th mailbox creation must fail visibly.

### E2E-02 Inbound receive and inbox UX
1. Deliver test email to owned mailbox.
2. Confirm inbox item appears.
3. Open detail view.
4. Confirm sender, subject, preview/body, and extraction card render.
5. Confirm no AI-dependent loading blocks core message view.

### E2E-03 Accepted attachment flow
1. Deliver email with accepted-size attachment.
2. Open message.
3. Preview/download attachment.
4. Confirm attachment metadata and blob linkage are correct.

### E2E-04 Oversized attachment/email flow
1. Deliver email at/above app rejection threshold.
2. Confirm message does not crash processing.
3. Confirm rejection/truncation state is visible.
4. Confirm inbox remains usable.

### E2E-05 Outbound send and quota exhaustion
1. Send mail under quota from UI.
2. Verify sent history/status entry.
3. Repeat until quota exhausted.
4. Confirm next send is blocked with clear feedback.
5. Confirm admin quota change or disable takes effect.

### E2E-06 API key lifecycle
1. Create API key from settings.
2. Store only displayed secret client-side; backend retains hash.
3. Use key against allowed user-core endpoint.
4. Verify key fails on admin endpoint.
5. Revoke key.
6. Confirm subsequent requests fail.

### E2E-07 Telegram happy-path and failure isolation
1. Bind Telegram notifications.
2. Deliver inbound email.
3. Confirm notification arrives.
4. Simulate Telegram failure.
5. Confirm inbox and message detail still succeed.

### E2E-08 Admin minimum surface
1. Sign in as admin.
2. Create/revoke invite code.
3. View user and mailbox overview.
4. Change quota or disable abusive sender.
5. Toggle bounded feature flag/kill-switch.
6. Confirm no unsupported admin areas are exposed.

## Observability requirements
Evidence must exist for:
- inbound processed count
- oversize rejected/truncated count
- send success/failure count
- extraction method (`regex`, `ai`, `none`)
- Telegram success/failure count
- cleanup deletion count and cleanup drift count
- API-key auth failure count
- active users/mailboxes/outbound failures/cleanup backlog counters

## Manual staging smoke checklist
- inbound email is accepted for allowed-size message
- accepted attachment preview/download works
- oversized attachment or message yields non-fatal handling
- outbound send succeeds through Resend
- extraction appears or degrades gracefully when AI unavailable
- Telegram disabled/failing does not block inbox correctness
- cleanup removes expired D1 + R2 artifacts
- admin can create/revoke invite and adjust quota
- API key cannot access admin routes

## Commands expected during implementation verification
```text
pnpm lint
pnpm typecheck
pnpm test --filter worker
pnpm test --filter web
pnpm build
```

## Evidence required before execution can claim done
1. Passing lint/typecheck/build output
2. Passing worker and web automated tests
3. E2E evidence for AC-01 through AC-12
4. Staging/manual evidence for AC-13 and AC-14
5. Explicit note of any remaining risk, skipped scenario, or environment constraint

## Out-of-scope validation
The following are intentionally excluded from v1 sign-off:
- SMTP/IMAP client compatibility
- OAuth login
- multilingual UX
- multi-tenant isolation
- complex admin permissions model
