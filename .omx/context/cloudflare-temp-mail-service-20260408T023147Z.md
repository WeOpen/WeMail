# Context Snapshot

- **Task statement:** Create a self-hosted temporary email service similar to Temp-Mail, hosted entirely on Cloudflare's free stack.
- **Desired outcome:** A zero-cost, private temporary email product with address generation, inbox viewing, attachments, sending, AI extraction, Telegram notifications, admin management, and optional client access.
- **Stated solution:** Cloudflare Worker backend, Cloudflare Pages frontend (possibly React), Cloudflare AI extraction, SMTP/IMAP proxy, Telegram bot, admin dashboard.
- **Probable intent hypothesis:** Reduce third-party dependency and privacy risk while keeping operating cost at or near at or near  and and staying within Cloudflare-managed infrastructure.

## Known facts / evidence
- Repository currently appears greenfield: top-level contains only README.md, .git/, and .omx/.
- README.md currently contains only # wemail.
- User explicitly requested deep-interview before planning or implementation.
- User prefers Cloudflare free-tier hosting and privacy over feature simplicity.

## Constraints
- Must bias toward Cloudflare free stack / zero-cost hosting.
- Must be self-hosted and private.
- Backend target: Cloudflare Workers.
- Frontend target: Cloudflare Pages, likely React.
- No implementation should start during deep-interview mode.

## Unknowns / open questions
- What "zero-cost" means in practice (strict free-tier only vs occasional paid migration allowed later).
- Which features are mandatory for v1 vs aspirational.
- Whether custom domain / MX routing is available and acceptable.
- Whether SMTP/IMAP client compatibility is hard requirement or stretch goal.
- Required privacy, abuse controls, retention, and authentication model.
- Admin dashboard scope and operational expectations.
- Multi-user vs personal-only service.
- Delivery reliability expectations for outbound mail.

## Decision-boundary unknowns
- What architecture tradeoffs OMX may choose without confirmation.
- Whether non-Cloudflare components are acceptable if Cloudflare-free cannot satisfy all features.
- Whether phased delivery is acceptable when some requested features are infeasible on free tier.

## Likely codebase touchpoints
- Cloudflare Worker app for API + inbound mail processing.
- Cloudflare Pages frontend for inbox UI and admin UI.
- Shared schema/types for mailbox, message, attachment, AI extraction, and notifications.
- Cloudflare config (wrangler.*, Pages config, bindings, storage).
- Telegram bot integration layer.
