# Changelog

All notable changes to WeMail will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Maintenance Rules

- Every commit must update this file under `[Unreleased]` or the release section being cut.
- Write human-readable product, project, release, and process changes. Do not dump raw git logs.
- Use the Keep a Changelog categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- Use ISO 8601 dates (`YYYY-MM-DD`) for released versions.

## [Unreleased]

### Fixed

- Fixed session recovery when browsers send both stale host-only and current domain-scoped login cookies.

## [0.1.5] - 2026-06-28

### Fixed

- Added a Cloudflare Worker route permission preflight and deployment docs for `Workers Routes: Edit` token failures.
- Tightened Telegram settings page left-column card spacing so the support rail no longer stretches the main card stack.
- Stabilized design system lazy-route assertions under slower CI test runs.
- Fixed GitHub OAuth callbacks so missing private email data no longer fails silently and public profile emails can continue to the invite-code flow.
- Fixed OAuth sessions for deployments that use a separate same-site API subdomain by sharing the session cookie across the configured parent domain.
- Shortened long profile email displays with hover titles so LinuxDo relay addresses no longer overflow personal settings cards.
- Replaced inline table loading and zero-data text with reusable loading and empty state cards across user, account, and mailbox selector tables.

## [0.1.4] - 2026-06-27

### Added

- Added detailed OAuth provider configuration documentation to the docs site.
- Added GitHub and LinuxDo OAuth quick login with invite-gated onboarding for new third-party users.
- Added Telegram Bot command menu configuration and bound-chat quick commands for status, accounts, recent messages, pause/resume, and test notifications.
- Added an admin Telegram Webhook configuration action that writes the current Worker API endpoint to Telegram from the settings page.

### Changed

- Changed the Telegram settings page so admin sessions can configure the Bot command menu with an in-page button instead of a manual curl command.
- Expanded the Worker configuration docs with an end-to-end Telegram Bot setup guide covering BotFather, secrets, button-based webhook/menu setup, admin toggles, user binding, and troubleshooting.
- Removed the Worker `.env` template workflow and kept backend-managed defaults out of committed Wrangler vars.
- Refined Webhook side-rail endpoint action buttons with compact balanced spacing and a lighter delete state.
- Changed the landing footer docs shortcut to the hosted documentation domain and added the shared floating back-to-top action to the homepage.
- Changed the public design system page to share the workspace theme toggle and theme storage with the homepage.
- Changed the outbound summary row so the mailbox selector and three metric cards fill the desktop row with clearer bordered hover states.
- Opened mailbox account list and mailbox domain management to member sessions while keeping account mutation and runtime policy controls admin-only.
- Clarified runtime default quota fields for mailbox daily sending and API daily calls, with tests covering new-user quota grants from updated defaults.
- Changed the web app routing to lazy-load public and workspace pages so the initial production bundle is smaller while preserving Nivo chart rendering.
- Changed lazy-loaded workspace routes to show a dashboard-shaped skeleton while page chunks load.
- Deferred Nivo dashboard and announcement charts into async page-level chunks with lightweight chart skeletons.
- Split the authenticated workspace shell into its own lazy chunk so public and signed-out entry paths avoid loading inbox, settings, admin, and workspace layout code up front.
- Scoped workspace startup data fetching to the active route so dashboard entry avoids preloading API keys, Telegram, dictionaries, runtime settings, mailbox setup, admin dashboard, and outbound history data.
- Added hover/focus prefetching for lazy workspace route chunks and deferred expensive chart mounts until their chart regions approach the viewport.
- Narrowed settings action refreshes so API key, Telegram, and runtime-setting saves only refetch the settings domain they changed.
- Added frontend GET request deduplication, short-lived cache entries for low-frequency configuration data, and cached route-data prefetches for lightweight workspace targets.
- Added stable Vite vendor chunk grouping, production bundle budget checks, and offscreen rendering containment for repeated mail and announcement list items.
- Clarified that `TELEGRAM_WEBHOOK_SECRET` is required in staging and production when Telegram is enabled.

### Fixed

- Fixed the public landing footer so its system status is loaded from the real health API instead of hardcoded copy.
- Fixed OAuth quick-login link accessible names so screen readers announce the full login action.
- Fixed the floating back-to-top action contrast in dark mode.
- Removed the docs app build-time Google Fonts fetch so root production builds do not fail on external font network errors.
- Made the Worker dry-run build non-interactive so local `pnpm build` does not hang on Wrangler prompts.
- Fixed the Cloudflare preview workflow so secret checks no longer use unsupported step-level secret expressions.
- Fixed frontend API handling for successful empty responses and prevented invalidated in-flight GET requests from rewriting stale cache entries.
- Fixed outbound summary style regression coverage to match the current balanced desktop command strip layout.

### Security

- Required Telegram webhook secret validation outside local Worker environments so production webhook calls fail closed when the secret is missing or invalid.
- Hardened webhook endpoint URL validation against local, private, reserved, and IPv4-mapped IPv6 literal targets.
- Pinned GitHub Actions workflow dependencies to commit SHAs and upgraded vulnerable Hono, React Router, Vite, Vitest, Wrangler, Miniflare, undici, ws, and jsdom dependency paths.
- Ensured a Telegram chat can only be bound to one WeMail user so bot commands cannot resolve to an ambiguous account.

## [0.1.3] - 2026-06-21

### Added

- Added admin-managed runtime business settings for mailbox limits, retention, outbound/API defaults, attachment limits, and AI fallback quotas.
- Added one-click Vercel deployment buttons and setup guidance for the standalone docs app.
- Added a standalone Fumadocs documentation app under `apps/docs`.
- Added detailed beginner-focused WeMail deployment docs with local setup, Cloudflare resources, Worker config, Email Routing, Pages, GitHub Actions, operations checks, and screenshot-style visual guides.
- Added design system documentation entries for FilterBar, Icon, Divider, Chart, and Toast, with fuller component intros and additional examples across existing primitives.
- Added a floating back-to-top icon action to the design system page.

### Changed

- Changed system settings domain management to save pending domain input from the main save action and clarified open-source Cloudflare binding configuration docs.
- Changed deploy-time business defaults and feature toggles to be managed from the WeMail admin UI and persisted in D1 instead of requiring open-source `wrangler.toml` edits.
- Changed the Cloudflare deployment workflow to inject private Worker D1 and KV binding IDs from GitHub Environment secrets for open-source repository safety.
- Changed the standalone docs site metadata to use the same favicon, Apple touch icon, manifest, and theme color as the WeMail main site.
- Expanded the root README with a centered brand header, project badges, and detailed Cloudflare deployment steps.
- Changed the app logo, favicon, Apple touch icon, PWA icon, and social preview image to use the shared `WeMail.png` brand asset.
- Changed the signed-in home page behavior so authenticated users can still view the public landing page, with header and landing CTA auth buttons replaced by console entries.
- Changed the design system page into a grouped component gallery without the left sidebar or prose documentation panels.
- Changed the design system gallery spacing and signed-in navigation so component previews breathe more and the public header shows the console action for authenticated users.
- Changed the design system component detail pages to show current-component examples first and remove unrelated section-level preview panels.

### Fixed

- Fixed Cloudflare Pages production builds so browser API requests target the configured Worker origin instead of the Pages `/api` path.
- Fixed registration on Cloudflare Workers by keeping PBKDF2 password hashing within the Workers WebCrypto iteration limit.
- Fixed empty dashboard charts so fresh deployments do not render invalid SVG paths in the browser console.
- Clarified Cloudflare API domain setup so production deployments prefer same-site Worker custom domains over `workers.dev` for browser sessions.
- Fixed first-user registration so an empty deployment can create its initial admin account without an invite code.
- Fixed D1 migrations so a fresh Cloudflare database can initialize from the migration chain, including API key and Telegram subscription tables.
- Fixed Cloudflare production deployment configuration so D1 migrations use the Worker DB binding and deploy jobs call the installed Wrangler CLI directly.
- Fixed the runtime settings save button contrast so its label remains readable.
- Fixed runtime settings validation, docs metadata warnings, and stale deployment troubleshooting notes.
- Fixed the docs homepage hero spacing so the logo, title, and console content sit closer to the navigation instead of leaving a large blank band.
- Fixed the docs deployment guide to recommend default Vercel install and build commands when deploying from the `apps/docs` root directory.
- Fixed design system sidebar navigation so selecting a component returns the right-hand detail panel to the top.
- Fixed the design system sidebar on compact viewports so long component menus remain clickable instead of being covered by the detail panel.

## [0.1.2] - 2026-06-16

### Added

- Added a per-user daily API call quota with a 20,000 default, admin configuration controls, and API-key request enforcement.
- Added a session-authenticated profile settings API with persisted user preferences for the personal settings page.
- Added the account list route data layer for server-backed filtering, pagination, export, create, update, and deletion workflows.
- Added admin and account tests covering bulk account operations, hard deletion safeguards, and server-backed account list behavior.
- Added configured-domain selection to account creation, backed by a role-filtered account domain API.
- Added shared account-policy validation and a policy-enforced bulk account deletion API.
- Added server-backed mail message search, extraction filtering, pagination, and summary metadata to the mail list API.
- Added inbound-mail integration coverage for Cloudflare Email Routing storage, extraction, and account activity updates.
- Added D1 query indexes for account-scoped mail message pagination, received-time ordering, and attachment filtering.
- Added administrator-visible retention for inbound mail sent to addresses that are not registered as system accounts.
- Added Telegram overview and test-message endpoints wired into the settings UI so the page reflects backend capability state and sends real test notifications.
- Added Telegram delivery history, Chat validation, extraction-result notifications, and API Key security notifications.
- Added Telegram one-time `/start` binding codes and a Bot webhook endpoint so users can bind chats without manually copying Chat IDs.
- Added server-side outbound mail pagination, search, status filtering, raw delivery details, and provider payload persistence.
- Added real Webhook dispatch with signed test events, inbound mail event fan-out, delivery retry, response capture, and signing-secret rotation.
- Added paginated announcements API responses, admin-only announcement publishing coverage, login announcement reminders, and a topbar recent-announcements badge.
- Added server-side announcement visibility, search/filter query handling, global featured/summary payloads, detail lookup, and audience-aware receipt counts.
- Added a shared dictionary catalog with Worker APIs, D1 persistence for dictionary overrides, and frontend session-scoped dictionary caching.
- Added a Cloudflare KV-backed cache layer for dictionary catalogs, feature toggles, domain settings, account policy, and mail settings.

### Changed

- Expanded the deployment runbook with a detailed staged release flow, production gates, smoke checks, rollback steps, and incident handling template.
- Changed the dashboard page to load KPI, trend, distribution, growth, resource, and role data from the Worker dashboard API instead of local mock data.
- Moved the API key status metric cards into the credential security hero card so the page starts as a single consolidated control panel.
- Refactored the Webhook settings page into an endpoint workbench with editable endpoint state, event subscriptions, signing details, and delivery-log triage.
- Refined the Webhook workbench layout by removing the integration-choice card and giving logs, payload, and side-rail actions clearer placement.
- Changed Webhook endpoint creation into a dialog flow, paginated the endpoint list, and promoted developer reference and delivery logs to full-width workbench cards.
- Refined Webhook test-event feedback, payload code blocks, and endpoint status pill sizing.
- Changed Webhook endpoint listing to use the shared account-list pagination UI backed by paginated worker responses.
- Changed the Webhook page to manage endpoint editing, enablement, deletion, delivery filtering, log pagination, and payload detail review through backend APIs.
- Refactored the personal settings page into a visible overview, form, and side-rail layout backed by real profile and preference data instead of page-local mock defaults.
- Refactored the system settings page into overview, appearance controls, and status rail sections backed by real theme and domain-permission state.
- Refactored the account settings page into a policy-console layout with overview metrics, switch-based controls, and a status side rail.
- Refactored the Telegram notification page into a status-first control center with binding, preference, validation, and setup guidance sections.
- Changed the Telegram notification page to include automatic binding controls and localized delivery timestamps.
- Refactored the mail list page into a command-center workspace with message search, extraction filters, attachment filtering, and responsive list/detail states.
- Refactored the outbound mail page into a real-record workspace with status tabs, summary metrics, pagination, detail actions, and empty states.
- Changed the outbound mail page to request filtered pages from the backend and open persisted raw delivery details from the record detail action.
- Refined the outbound mail page visual hierarchy with a tighter command header, single-line status tabs, and softer empty states.
- Added a switchable outbound mailbox identity control so the send-history workspace can refresh records for different sender accounts.
- Simplified the outbound mail header while retaining the mail-center kicker, moved summary metrics into full-row cards, and aligned the list/detail panel heights.
- Changed outbound workspace defaults so saved mail-setting filters initialize the real backend-backed sent/failed views.
- Changed mail notification targets to select already configured Webhook endpoints and Telegram bindings instead of accepting direct target input.
- Changed the mail list mailbox picker into a searchable command-card selector, with empty selection loading messages from all user accounts.
- Changed mail list message search, extraction filters, and pagination to load from backend query results instead of page-local filtering.
- Refined the mail list reading layout by removing redundant list/detail headings and moving sender and received-time metadata into the message cards.
- Changed the mail list quick filters from buttons to segmented tabs and shortened the all-messages label to "全部".
- Changed mail list message cards to show sender, second-precision contextual time, extraction chip, and subject in a compact reference-list hierarchy.
- Added semantic icons to mail list filters, extraction chips, and attachment chips.
- Changed mail detail actions into right-aligned icon buttons with hover tooltips and a single-line subject title.
- Changed mail detail extraction results into a confidence card and moved mailbox selection into a paginated table dialog with double-click selection.
- Changed the mail list to load message details by id, debounce backend search, poll the current query, and show retryable list/detail loading errors.
- Changed the mailbox selector so administrators can page through all enabled accounts with creator metadata while members only see their own enabled accounts.
- Changed empty mail list and empty detail states into icon-based empty cards.
- Changed account deletion so normal deletes soft-delete accounts while policy-gated bulk hard deletion handles irreversible removal.
- Reduced explanatory copy in the personal settings cards so the page emphasizes fields, status, and actions.
- Adjusted the personal settings preference summary card so timezone joins the preference chip group with distinct chip colors.
- Made personal profile preferences affect sign-in routing, workspace density, and profile date formatting, with retryable loading errors and dirty-state save actions.
- Changed the mail settings page to load, validate, and save through the backend mail settings endpoint instead of page-local defaults.
- Changed the release workflow to publish GitHub releases directly instead of creating draft releases.
- Changed account and admin workspaces to use the expanded account management API data model.
- Refactored the announcements page to use backend data, multiple pinned announcement switching, a publish dialog, shared pagination, and real empty/loading states.
- Refined announcements so pinned items sort first, display pinned chips in the list, and use an automatic carousel with compact bottom indicators.
- Changed the pinned announcements carousel to use a right-aligned vertical timed indicator with animated announcement switching.
- Added announcement start/end windows, per-user receipt status, detail viewing, and admin edit/archive/delete actions.
- Changed the announcements page to rely on backend query results for filters, featured announcements, overview totals, and post-mutation refreshes.

### Removed

- Removed the mail list preview mock messages so an empty backend response now renders the real empty state.
- Removed the outbound page's local exception mock record so the page only reflects backend-provided send history.
- Removed the mail settings mock data module so settings state comes from shared defaults and persisted backend data.
- Removed the unused legacy Telegram settings panel in favor of the backend-backed Telegram control page.
- Removed the announcements page mock data module so announcement lists and pinned cards come from backend responses.

### Fixed

- Fixed the topbar announcement menu so acknowledged announcements no longer inflate the badge count, recent announcements open a detail dialog, and the username row is removed.
- Fixed announcement validation so invalid status/type/audience/priority values and reversed publish windows are rejected by the Worker.
- Fixed the mail settings notification target row by removing redundant Telegram helper copy and aligning the target controls to one height.
- Fixed mail detail tooltips so copy is centered, and improved verification-code chip contrast across light and dark mail list states.
- Fixed the mail list mailbox selector with hover-to-clear selection, a further compacted recognition card, and a create-mailbox dialog aligned with account creation domain requirements.
- Fixed mail detail recognition cards so link results display the extracted URL instead of the link label text.
- Fixed mail list refreshes so the selected message stays open when the refreshed result still contains it.
- Fixed account settings so the page loads, saves, validates, and enforces real backend policy data instead of falling back to account mock data.
- Fixed mailbox selector table column sizing and hover titles, and removed the duplicate empty-detail heading.
- Fixed the mail settings summary rail so long strategy and identity values wrap without squeezing labels vertically.
- Fixed mail settings option parsing types so shared type checking accepts validated enum values.
- Fixed inbound Telegram notifications so they respect the global Telegram feature flag.
- Fixed the legacy outbound exception filter so it migrates to the supported failed view instead of leaving an empty placeholder tab.
- Fixed mail routing saves so enabled Webhook and Telegram targets must reference configured, enabled integrations.
- Fixed outbound sending so persisted sender settings apply signatures, sender identity, retry attempts, recipient validation, and audit-friendly provider responses.
- Fixed pre-deploy Worker safety checks by applying D1 migrations in the Cloudflare deployment workflow before publishing the Worker.
- Fixed credentialed CORS handling so configured production origins are echoed explicitly instead of returning `*` with credentials.
- Fixed quota races so concurrent API-key requests and outbound sends cannot both consume the same remaining daily allowance.
- Fixed mailbox creation limits so soft-deleted accounts no longer count against a user's active mailbox allowance.
- Fixed attachment downloads so untrusted filenames are sanitized and encoded in `Content-Disposition`.
- Fixed the web smoke E2E suite to match current route redirects, tab navigation, admin data mocks, and announcement behavior.
- Fixed the dashboard metrics regression test so its inbound-mail fixture follows the current test date instead of aging out of the "today" trend bucket.

## [0.1.1] - 2026-06-08

### Added

- Added the project-level changelog and commit-time changelog maintenance rule.
- Added project documentation entries for changelog discovery and release-time version checks.
- Added a shared WeMail version constant for UI and runtime consumers.
- Added `version:sync` and `version:check` scripts for root-version-driven package, shared metadata, and OpenAPI synchronization.
- Added changelog release-section validation to the project version check.

### Changed

- Refactored the About page into a product narrative around WeMail as a trusted mail boundary.
- Aligned About page action styles and icons with the workspace navigation system.
- Documented the root `package.json` version as the intended project version source of truth.
- Changed the About page version display to read from shared package metadata instead of a page-local literal.
- Changed OpenAPI generation to use the root project version for `info.version`.
- Changed GitHub Actions CI, release, and Cloudflare deploy verification to run `pnpm version:check`.

## [0.1.0] - 2026-06-07

### Added

- Established the current tracked baseline from the existing monorepo package versions.

[Unreleased]: https://github.com/WeOpen/WeMail/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/WeOpen/WeMail/releases/tag/v0.1.5
[0.1.4]: https://github.com/WeOpen/WeMail/releases/tag/v0.1.4
[0.1.3]: https://github.com/WeOpen/WeMail/releases/tag/v0.1.3
[0.1.2]: https://github.com/WeOpen/WeMail/releases/tag/v0.1.2
[0.1.1]: https://github.com/WeOpen/WeMail/releases/tag/v0.1.1
[0.1.0]: https://github.com/WeOpen/WeMail/releases/tag/v0.1.0
