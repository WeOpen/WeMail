# WeMail Prelaunch Performance Report

Date: 2026-06-16 Asia/Shanghai
Target: local production preview, `http://127.0.0.1:4173`
Branch/worktree: current dirty workspace

## Scope

This report captures a local prelaunch performance baseline:

- Production build size
- Browser navigation timing for public pages
- Browser navigation timing for authenticated workspace pages with Playwright API mocks
- Worker application-layer route timing with the in-memory test harness
- E2E smoke runtime

This is not a Cloudflare edge benchmark. It does not include real D1, KV, Email Routing, Resend, Telegram, or network latency.

## Build Size

Command:

```bash
time pnpm build
```

Result:

- Status: pass
- Wall time: 6.60s
- Worker dry-run upload: 491.86 KiB
- Worker dry-run gzip: 100.47 KiB
- Web CSS: 277.63 kB, gzip 45.06 kB
- Web JS: 1,120.92 kB, gzip 344.22 kB

Finding:

- The production build still emits Vite's large chunk warning because the initial JS chunk is over 500 kB.
- Gzipped transfer is acceptable for local baseline, but the uncompressed single chunk is a clear code-splitting candidate before the app grows further.

## Public Page Timing

Method:

- Vite production preview
- Chromium headless via Playwright
- 3 fresh browser contexts per route
- Median reported

| Route | TTFB | FCP | LCP | CLS | DOM Complete | Wall Time | Requests | Transfer | JS | CSS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 1 ms | 64 ms | 224 ms | 0 | 51 ms | 877 ms | 3 | 390,974 B | 344,518 B | 45,363 B |
| `/login` | 1 ms | 68 ms | 92 ms | 0 | 54 ms | 831 ms | 3 | 390,974 B | 344,518 B | 45,363 B |
| `/design-system` | 1 ms | 136 ms | 136 ms | 0 | 50 ms | 870 ms | 3 | 390,974 B | 344,518 B | 45,363 B |

Slowest/largest first-party resources:

- `index-qywWeqjh.js`: 344,518 B gzip transfer, 20-23 ms local resource duration
- `index-ClkbvwHH.css`: 45,363 B gzip transfer, 5-7 ms local resource duration
- `/api/auth/session`: about 1,093 B in local preview fallback path

## Authenticated Workspace Timing

Method:

- Vite production preview
- Playwright route mocks for API responses
- 3 fresh browser contexts per route
- Median reported

| Route | TTFB | FCP | LCP | CLS | DOM Complete | Wall Time | Requests | Transfer | JS | CSS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/dashboard` | 1 ms | 72 ms | 212 ms | 0.0073 | 57 ms | 878 ms | 20 | 399,255 B | 344,518 B | 45,363 B |
| `/mail/list` | 1 ms | 68 ms | 224 ms | 0.0269 | 54 ms | 877 ms | 21 | 399,605 B | 344,518 B | 45,363 B |
| `/announcements` | 1 ms | 68 ms | 212 ms | 0.0045 | 52 ms | 897 ms | 20 | 400,008 B | 344,518 B | 45,363 B |

Finding:

- Local browser timing is healthy for mocked data.
- The app pays the same initial JS/CSS cost on every route because the frontend is currently emitted as a single large app chunk.
- `/mail/list` has the highest CLS in this sample at 0.0269, still below the 0.1 good threshold.

## Worker Application-Layer Timing

Method:

- `createWorkerTestHarness`
- in-memory store
- 120 sequential requests per endpoint
- Includes Hono routing and JSON serialization, excludes Cloudflare edge and D1 latency

| Endpoint | Status | p50 | p95 | Max |
| --- | ---: | ---: | ---: | ---: |
| `/api/system/health` | 200 | 0.16 ms | 0.44 ms | 0.97 ms |
| `/api/auth/session` | 200 | 0.15 ms | 0.23 ms | 0.54 ms |
| `/api/accounts` | 200 | 0.13 ms | 0.22 ms | 0.41 ms |
| `/api/mail/messages` | 200 | 0.14 ms | 0.20 ms | 0.52 ms |
| `/api/announcements` | 200 | 0.14 ms | 0.24 ms | 0.44 ms |

Finding:

- No application-layer route bottleneck showed up in the in-memory harness.
- Production risk remains in real bindings and external calls, especially D1 query shape, Email Routing, Resend, Telegram, and Webhook targets.

## E2E Runtime

Command:

```bash
time pnpm test:e2e
```

Result:

- Status: pass
- Playwright result: 13 passed, 2 skipped
- Playwright reported duration: 3.9s
- Command wall time: 4.64s

Slowest E2E samples:

- Announcements member board: 613 ms
- Authenticated shared shell: 567 ms
- Landing page: 519 ms
- Design system public docsite: 459 ms

## Full Test Runtime

Command:

```bash
time pnpm test
```

Result:

- Status: pass
- Shared tests passed: 14/14
- Worker tests passed: 86/86
- Web tests passed: 265/265
- Total test files passed: 76/76
- Total tests passed: 365/365

Previously observed failure:

```text
expected { day: '今天', inbound: 0, outbound: 2 }
to match { inbound: 1, outbound: 2 }
```

Resolution:

- Fixed the dashboard test fixture so inbound mail uses the current test date instead of a hard-coded 2026-06-15 timestamp.
- Re-ran `pnpm test`; all suites passed.

## Performance Budget Check

| Budget | Target | Current | Status |
| --- | ---: | ---: | --- |
| FCP public pages | < 1.8s | 64-136 ms | Pass |
| LCP public pages | < 2.5s | 92-224 ms | Pass |
| CLS workspace pages | < 0.1 | 0.0045-0.0269 | Pass |
| Gzip JS transfer | < 500 kB | 344.5 kB | Pass |
| Single uncompressed JS chunk | < 500 kB | 1,120.9 kB | Fail |
| Local workspace requests | < 50 | 20-21 | Pass |
| E2E smoke wall time | < 10s | 4.64s | Pass |

## Recommendations

1. Add frontend code splitting.
   The current app ships one 1.1 MB uncompressed JS chunk. Route-level lazy loading for admin/settings/design-system areas is the highest-return next step.

2. Add a production-like Worker benchmark after Cloudflare bindings are configured.
   Local in-memory timings are clean, but they do not measure D1, KV, R2, Email Routing, Resend, Telegram, or Webhook latency.

3. Capture this report as the baseline for the next release.
   Future runs should compare bundle size, route FCP/LCP, request count, and E2E duration against this file.
