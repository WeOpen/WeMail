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

### Added

- Added the account list route data layer for server-backed filtering, pagination, export, create, update, and deletion workflows.
- Added admin and account tests covering bulk account operations, hard deletion safeguards, and server-backed account list behavior.

### Changed

- Changed the release workflow to publish GitHub releases directly instead of creating draft releases.
- Changed account and admin workspaces to use the expanded account management API data model.

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

[Unreleased]: https://github.com/WeOpen/WeMail/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/WeOpen/WeMail/releases/tag/v0.1.1
[0.1.0]: https://github.com/WeOpen/WeMail/releases/tag/v0.1.0
