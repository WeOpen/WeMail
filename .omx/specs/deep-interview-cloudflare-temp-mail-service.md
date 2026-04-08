# Deep Interview Spec — Cloudflare Temp Mail Service

## Metadata
- **Task slug:** cloudflare-temp-mail-service
- **Profile:** standard
- **Rounds:** 7
- **Context type:** greenfield
- **Final ambiguity:** 19.7%
- **Threshold:** 20%
- **Context snapshot:** .omx/context/cloudflare-temp-mail-service-20260408T023147Z.md
- **Transcript:** .omx\interviews\cloudflare-temp-mail-service-20260408T044826Z.md

## Clarity breakdown
| Dimension | Score |
| --- | ---: |
| Intent | 65% |
| Outcome | 82% |
| Scope | 90% |
| Constraints | 90% |
| Success criteria | 88% |
| Context | 90% |

## Intent (why)
Build a private/self-controlled temporary email service for public use, avoiding dependence on existing temp-mail operators while keeping infrastructure concentrated on Cloudflare. The product should feel modern and credible rather than like a raw clone, while preserving the useful capabilities of the chosen reference implementation.

## Desired Outcome
A launchable v1 public temp-mail service with invite-only registration, modern responsive UI, rewritten backend, web inbox, attachment viewing, outbound sending, AI extraction of verification info, Telegram notifications, API-key-based programmatic access, and a minimal admin dashboard for managing the system.

## In Scope (v1)
- Public-facing service with **invite-only** registration
- Account-bound temporary mailbox creation and usage
- Cloudflare Worker backend
- Cloudflare Pages frontend, with modern redesigned UI
- Temporary email address generation/management for authenticated users
- Inbox listing and email detail views
- Attachment viewing/downloading
- Outbound email sending
- AI extraction for verification codes / key links / important info
- Telegram notifications for new mail
- API key creation and use for core APIs
- Admin dashboard with at least user management and invite-code management
- Backend rewritten with the reference project used as behavior inspiration, not copied wholesale

## Out of Scope / Non-goals (v1)
- SMTP/IMAP proxy support (phase 2)
- OAuth login
- Multi-language support
- Complex permission/role systems
- Open registration
- Multi-tenant architecture

## Decision Boundaries (what OMX may decide without confirmation)
OMX may decide, without re-asking, the specific internal architecture, framework choices, schema design, API contract shape, UI component system, storage split, and implementation sequencing **as long as** the following boundaries hold:
- Cloudflare remains the primary hosting/runtime stack
- Resend is the **only approved external exception**, used solely for outbound mail if needed
- v1 stays account-bound and invite-only
- SMTP/IMAP remains phase 2, not v1
- No OAuth, no multilingual, no complex permissions, no open signup, no multi-tenant in v1
- Frontend should be significantly improved visually compared with the reference project
- Backend should be rewritten, not directly transplanted

## Constraints
- Primary platform: Cloudflare Workers + Cloudflare Pages
- Prefer Cloudflare services such as D1/KV/R2 where appropriate
- Public service must still be protected by invite registration and authenticated mailbox ownership
- Outbound sending may rely on Resend as the only allowed non-Cloudflare dependency
- Architecture should stay cost-conscious and compatible with a zero/near-zero-cost operating target
- The system should be modeled after `dreamhunter2333/cloudflare_temp_email` feature-wise, but not reproduced verbatim

## Testable Acceptance Criteria
A v1 build is acceptable when all of the following are true:
1. A new user can register only with a valid invite.
2. An authenticated user can create and manage a temporary mailbox.
3. The user can receive mail and view inbox/message details in the web UI.
4. The user can view or download attachments from received emails.
5. The user can send an outbound email successfully.
6. AI extraction surfaces verification codes, confirmation links, or similarly important info from messages.
7. Telegram notifications can be configured and are triggered for new email.
8. Admin can manage users and invite codes from the dashboard.
9. API keys can be issued and used against the core APIs.
10. The UI is modern/responsive and materially cleaner than the reference implementation.

## Assumptions exposed + resolutions
- **Assumption:** “Strict Cloudflare-only” and “usable outbound mail” could both be true in v1.
  - **Resolution:** They conflict; usable outbound sending is prioritized, and Resend is approved as the sole exception.
- **Assumption:** Public temp mail needs anonymous mailbox creation.
  - **Resolution:** Rejected. v1 mailbox creation requires an invited, logged-in account.
- **Assumption:** SMTP/IMAP is required for launch.
  - **Resolution:** Rejected. It is phase 2.

## Pressure-pass findings
The interview revisited the earlier Cloudflare-only answer and forced a concrete tradeoff between architectural purity and functional outbound sending. That changed the spec materially: v1 is no longer “strictly Cloudflare-only”; it is “Cloudflare-first with Resend allowed for outbound mail only.”

## Technical context findings
- **Evidence:** The current repository is effectively empty/greenfield except for `README.md` and OMX metadata.
- **Evidence:** The reference repo includes Worker, frontend, admin, Telegram, AI extraction, and a separate SMTP/IMAP proxy service.
- **Inference:** A phased delivery approach is appropriate because the reference system spans more surface area than the requested v1 strictly needs.

## Brownfield evidence vs inference notes
- This is a **greenfield** project, so there is no existing local product architecture to preserve.
- The only repository-grounded evidence used here came from inspecting the external reference repo cloned into `.omx/reference/cloudflare_temp_email`.

## Condensed transcript
### Round 1 — Intent
Public service, invite-only registration, reference `dreamhunter2333/cloudflare_temp_email`, frontend redesign, backend rewrite.

### Round 2 — Scope
SMTP/IMAP deferred to phase 2. API key support added to early scope.

### Round 3 — Non-goals
No OAuth, no multilingual, no complex permissions, no open signup, no multi-tenant.

### Round 4 — Tradeoff probe
“Strict Cloudflare-only” conflicted with the suggestion to use Resend for outbound mail.

### Round 5 — Decision boundary
User chose outcome-first: Resend is allowed as the sole exception.

### Round 6 — Success criteria
Invite registration, temp mailbox creation, receive/view/send flows, AI extraction, Telegram notifications, admin user/invite management, API key access.

### Round 7 — Abuse/account constraint
Mailbox creation requires an invited, logged-in user account.
