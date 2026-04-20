# API Keys Layout Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the `/api-keys` page so it shows four top summary cards, keeps `个人凭证` on the left, moves `快速开始` to the right, and removes the `安全建议` / `接入方式` side modules.

**Architecture:** Keep `ApiKeysPage` as the single page-level component that computes the summary counts and owns the create/reveal/revoke interactions. Replace the current `integration-page-grid` composition with a page-specific top summary strip plus a lower two-column content region, and keep all behavior mock-free except for existing local reveal/copy state. Reuse the existing settings integration primitives where they still fit, but remove `SettingsSupportCard` / `IntegrationChoiceCard` from the API keys page itself.

**Tech Stack:** React 19, React Router 7, TypeScript, Vitest + Testing Library, Playwright, shared CSS in `apps/web/src/shared/styles/index.css`

---

### Task 1: Lock the new API key page contract with failing tests

**Files:**
- Modify: `apps/web/src/test/integration/settings-page.test.tsx`
- Modify: `apps/web/src/test/app.test.tsx`
- Modify: `apps/web/e2e/smoke.spec.ts`

**Step 1: Write the failing integration assertions for the new layout**

Update `apps/web/src/test/integration/settings-page.test.tsx` in the existing `reveals a newly created api key and shows quickstart guidance` test.

Replace the old assertions:

```tsx
expect(screen.getByRole("heading", { name: /快速开始/i })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /安全建议/i })).toBeInTheDocument();
```

with the new layout contract:

```tsx
expect(screen.getByRole("heading", { name: /^API 密钥$/i })).toBeInTheDocument();
expect(screen.getByText(/^总密钥$/i)).toBeInTheDocument();
expect(screen.getByText(/^活跃密钥$/i)).toBeInTheDocument();
expect(screen.getByText(/^从未使用$/i)).toBeInTheDocument();
expect(screen.getByText(/^已吊销$/i)).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /快速开始/i })).toBeInTheDocument();
expect(screen.queryByRole("heading", { name: /安全建议/i })).not.toBeInTheDocument();
expect(screen.queryByRole("heading", { name: /如何选择这三种接入/i })).not.toBeInTheDocument();
```

Also assert the page exposes the new layout hooks:

```tsx
expect(document.querySelector(".api-keys-top-stats")).not.toBeNull();
expect(document.querySelector(".api-keys-content-grid")).not.toBeNull();
```

**Step 2: Add a route-level app assertion**

Append a new test to `apps/web/src/test/app.test.tsx` that boots the full app at `/api-keys` for an authenticated member and asserts:

```tsx
expect(await screen.findByRole("heading", { name: /^API 密钥$/i })).toBeInTheDocument();
expect(screen.getByText(/^总密钥$/i)).toBeInTheDocument();
expect(screen.queryByRole("heading", { name: /安全建议/i })).not.toBeInTheDocument();
expect(screen.queryByRole("heading", { name: /如何选择这三种接入/i })).not.toBeInTheDocument();
```

Use the same authenticated fetch-mocking pattern already present in `app.test.tsx` for settings routes.

**Step 3: Add smoke assertions for the shipped route**

In `apps/web/e2e/smoke.spec.ts`, update the authenticated member flow that currently visits `/settings` (which normalizes to `/api-keys`) to assert:

```ts
await expect(page.getByText(/^总密钥$/i)).toBeVisible();
await expect(page.getByText(/^活跃密钥$/i)).toBeVisible();
await expect(page.getByText(/^从未使用$/i)).toBeVisible();
await expect(page.getByText(/^已吊销$/i)).toBeVisible();
await expect(page.getByRole("heading", { name: /快速开始/i })).toBeVisible();
await expect(page.getByRole("heading", { name: /安全建议/i })).toHaveCount(0);
await expect(page.getByText(/如何选择这三种接入/i)).toHaveCount(0);
```

**Step 4: Run tests to confirm failure**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/settings-page.test.tsx src/test/app.test.tsx
pnpm exec playwright test -c apps/web/playwright.config.ts apps/web/e2e/smoke.spec.ts --grep "shared access shell|restores the intended route"
```

Expected:
- Vitest: FAIL because the four top cards and removed side modules are not implemented yet
- Playwright: FAIL because the API keys page still renders the old right-rail modules

**Step 5: Commit the red tests**

```bash
git add apps/web/src/test/integration/settings-page.test.tsx \
  apps/web/src/test/app.test.tsx \
  apps/web/e2e/smoke.spec.ts

git commit -F - <<'EOF'
Lock the new API key page layout contract before refactoring

These tests freeze the requested page structure so the API key screen
must move to four top summary cards, a right-side quickstart panel,
and no longer render the two auxiliary side modules.

Constraint: The user explicitly requested top-level status cards and removal of safety/integration side modules
Rejected: Keep only component-level assertions | would miss route regressions in the shipped app shell
Confidence: high
Scope-risk: narrow
Directive: If the API key layout changes again, update the tests only after design approval
Tested: vitest run src/test/integration/settings-page.test.tsx src/test/app.test.tsx; targeted Playwright smoke expected to fail
Not-tested: final implementation, responsive CSS, route normalization edge cases
EOF
```

---

### Task 2: Refactor `ApiKeysPage` into a top-stats + two-column layout

**Files:**
- Modify: `apps/web/src/features/settings/ApiKeysPage.tsx`
- Modify: `apps/web/src/features/settings/SettingsSupport.tsx`

**Step 1: Expand the summary model**

In `apps/web/src/features/settings/ApiKeysPage.tsx`, keep the current summary calculation but expand it to include `totalKeys`:

```tsx
const summary = useMemo(() => {
  const activeKeys = apiKeys.filter((key) => !key.revokedAt);
  const unusedKeys = activeKeys.filter((key) => !key.lastUsedAt).length;
  const revokedKeys = apiKeys.length - activeKeys.length;
  return {
    totalKeys: apiKeys.length,
    activeKeys: activeKeys.length,
    unusedKeys,
    revokedKeys
  };
}, [apiKeys]);
```

**Step 2: Replace the page structure**

Reshape the JSX to:

```tsx
<main className="workspace-grid api-keys-layout-grid">
  <section className="api-keys-top-stats" aria-label="API 密钥状态概览">
    <article className="panel workspace-card api-keys-stat-card">...</article>
    <article className="panel workspace-card api-keys-stat-card">...</article>
    <article className="panel workspace-card api-keys-stat-card">...</article>
    <article className="panel workspace-card api-keys-stat-card">...</article>
  </section>

  <div className="api-keys-content-grid">
    <section className="panel workspace-card page-panel integration-surface-card api-keys-primary-card">...</section>
    <section className="panel workspace-card page-panel integration-surface-card api-keys-quickstart-card">...</section>
  </div>
</main>
```

Use these titles exactly in the four cards:

```tsx
<strong>总密钥</strong>
<strong>活跃密钥</strong>
<strong>从未使用</strong>
<strong>已吊销</strong>
```

Each card should render the correct summary number plus a one-line helper copy.

**Step 3: Keep personal credentials on the left**

Keep all existing create/reveal/list logic inside the left `个人凭证` card. Preserve this order:

1. header + create button
2. inline create form (when open)
3. reveal card (when present)
4. key list or empty state

**Step 4: Move quickstart to the right**

Keep the existing quickstart content but move it into the right card. It should continue to use:

```tsx
const quickstartSecret = revealState?.secret ?? "<your-api-key>";
```

and must preserve:
- Authorization Header block
- curl block
- copy button

**Step 5: Remove the two side modules from this page**

Delete these imports from `ApiKeysPage.tsx`:

```tsx
import { IntegrationChoiceCard, SettingsSupportCard } from "./SettingsSupport";
```

and remove the entire `<aside className="integration-secondary-column">...</aside>` block.

Do not delete `SettingsSupport.tsx` itself, because `WebhookPage` and `TelegramSettingsPage` still use it.

If `SettingsSupport.tsx` becomes unused by `ApiKeysPage`, do not change its exports beyond removing dead imports if ESLint requires it.

**Step 6: Run tests to confirm the refactor passes**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/settings-page.test.tsx src/test/app.test.tsx
```

Expected: PASS

**Step 7: Commit the component refactor**

```bash
git add apps/web/src/features/settings/ApiKeysPage.tsx \
  apps/web/src/features/settings/SettingsSupport.tsx

git commit -F - <<'EOF'
Refocus the API key page around state, credentials, and quickstart

This refactor turns the API key screen into an operations-first layout
with top summary cards and a lower split between credential management
and immediate usage guidance.

Constraint: The page must remove the security-advice and integration-choice modules entirely
Rejected: Keep quickstart below the credentials card on desktop | conflicts with the approved side-by-side layout
Confidence: high
Scope-risk: moderate
Directive: Keep ApiKeysPage focused on managing and using API keys; do not reintroduce broad integration education here
Tested: vitest run src/test/integration/settings-page.test.tsx src/test/app.test.tsx
Not-tested: final responsive CSS, Playwright smoke, non-zero revoked state visuals
EOF
```

---

### Task 3: Add layout and responsive styles for the new API key composition

**Files:**
- Modify: `apps/web/src/shared/styles/index.css`

**Step 1: Add page-specific layout classes near the integration styles**

Append API-key-specific selectors near the existing integration block in `apps/web/src/shared/styles/index.css`:

```css
.api-keys-layout-grid {
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
}

.api-keys-top-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.api-keys-stat-card {
  display: grid;
  gap: 10px;
  align-content: start;
}

.api-keys-stat-card strong {
  font-size: 1rem;
}

.api-keys-stat-card span:last-child {
  color: var(--text-soft);
}

.api-keys-content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
  gap: 18px;
  align-items: start;
}

.api-keys-primary-card,
.api-keys-quickstart-card {
  align-content: start;
}
```

**Step 2: Add responsive rules**

Inside the existing responsive sections, add:

```css
@media (max-width: 1100px) {
  .api-keys-top-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .api-keys-content-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .api-keys-top-stats {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

Keep the styling consistent with existing workspace spacing, card radius, and muted text behavior.

**Step 3: Verify the page still reads well with and without keys**

Check that:
- top cards render with zero values
- quickstart still renders with placeholder secret
- revealState still swaps the secret into the quickstart panel

**Step 4: Run build + tests**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/settings-page.test.tsx src/test/app.test.tsx
pnpm exec tsc -p apps/web/tsconfig.json --noEmit
pnpm exec eslint apps/web/src/features/settings/ApiKeysPage.tsx apps/web/src/test/integration/settings-page.test.tsx apps/web/src/test/app.test.tsx
pnpm --dir apps/web exec vite build
```

Expected:
- Vitest: PASS
- TypeScript: PASS
- ESLint: PASS
- Vite build: PASS

**Step 5: Commit the styling pass**

```bash
git add apps/web/src/shared/styles/index.css

git commit -F - <<'EOF'
Lay out the API key page as a two-stage operations surface

These styles implement the approved top summary strip and lower
credentials/quickstart split while keeping the screen responsive across
desktop, tablet, and mobile breakpoints.

Constraint: Must fit the existing workspace visual system without adding new dependencies
Rejected: Create a page-local stylesheet just for ApiKeysPage | diverges from the current shared-style organization
Confidence: high
Scope-risk: narrow
Directive: Extend these selectors only for API-key-specific layout concerns; keep shared integration primitives generic
Tested: vitest run src/test/integration/settings-page.test.tsx src/test/app.test.tsx; tsc --noEmit; vite build
Not-tested: screenshot diffing, manual dark/light visual QA, very long localized copy
EOF
```

---

### Task 4: Prove the shipped route and remove stale expectations from smoke coverage

**Files:**
- Modify: `apps/web/e2e/smoke.spec.ts`
- Modify: `apps/web/src/test/integration/settings-page.test.tsx`
- Modify: `apps/web/src/test/app.test.tsx`

**Step 1: Finalize the route-level app test shape**

In the authenticated `/api-keys` app test, add assertions that the top cards are visible and the removed modules stay absent:

```tsx
expect(screen.getByText(/^总密钥$/i)).toBeInTheDocument();
expect(screen.getByText(/^活跃密钥$/i)).toBeInTheDocument();
expect(screen.getByText(/^从未使用$/i)).toBeInTheDocument();
expect(screen.getByText(/^已吊销$/i)).toBeInTheDocument();
expect(screen.queryByRole("heading", { name: /安全建议/i })).not.toBeInTheDocument();
expect(screen.queryByText(/如何选择这三种接入/i)).not.toBeInTheDocument();
```

**Step 2: Finalize the component-level settings integration test**

Add assertions that the four stat cards render the expected counts for the provided fixture:

```tsx
expect(screen.getByText(/^总密钥$/i)).toBeInTheDocument();
expect(screen.getByText(/^活跃密钥$/i)).toBeInTheDocument();
expect(screen.getByText(/^从未使用$/i)).toBeInTheDocument();
expect(screen.getByText(/^已吊销$/i)).toBeInTheDocument();
```

Use the existing fixture with one active, unused key so the top cards are meaningful.

**Step 3: Update Playwright smoke coverage**

In `apps/web/e2e/smoke.spec.ts`, keep the existing authenticated member path through `/settings` and assert:

```ts
await expect(page.getByText(/^总密钥$/i)).toBeVisible();
await expect(page.getByText(/^活跃密钥$/i)).toBeVisible();
await expect(page.getByText(/^从未使用$/i)).toBeVisible();
await expect(page.getByText(/^已吊销$/i)).toBeVisible();
await expect(page.getByRole("heading", { name: /快速开始/i })).toBeVisible();
await expect(page.getByRole("heading", { name: /安全建议/i })).toHaveCount(0);
await expect(page.getByText(/如何选择这三种接入/i)).toHaveCount(0);
```

**Step 4: Run the full required verification suite**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/settings-page.test.tsx src/test/app.test.tsx
pnpm exec tsc -p apps/web/tsconfig.json --noEmit
pnpm exec eslint apps/web/src/features/settings/ApiKeysPage.tsx apps/web/src/test/integration/settings-page.test.tsx apps/web/src/test/app.test.tsx apps/web/e2e/smoke.spec.ts
pnpm --dir apps/web exec vite build
pnpm exec playwright test -c apps/web/playwright.config.ts apps/web/e2e/smoke.spec.ts
```

Expected: all PASS.

**Step 5: Commit the verification sweep**

```bash
git add apps/web/e2e/smoke.spec.ts \
  apps/web/src/test/integration/settings-page.test.tsx \
  apps/web/src/test/app.test.tsx

git commit -F - <<'EOF'
Prove the API key page layout through route and smoke coverage

This locks the delivered API key layout into the shipped app shell so
future changes cannot quietly reintroduce the old side-rail modules or
break the new top-card structure.

Constraint: The final screen must not render security-advice or integration-choice sections anymore
Rejected: Stop at component tests only | route-level and smoke regressions would still slip through
Confidence: high
Scope-risk: narrow
Directive: If the API key layout changes again, update smoke expectations only after the design is re-approved
Tested: vitest run src/test/integration/settings-page.test.tsx src/test/app.test.tsx; tsc --noEmit; vite build; playwright smoke
Not-tested: screenshot diff review, production deployment, slow-network behavior
EOF
```

---

### Task 5: Final review and handoff

**Files:**
- Review only: `apps/web/src/features/settings/ApiKeysPage.tsx`
- Review only: `apps/web/src/shared/styles/index.css`
- Review only: `apps/web/src/test/integration/settings-page.test.tsx`
- Review only: `apps/web/src/test/app.test.tsx`
- Review only: `apps/web/e2e/smoke.spec.ts`

**Step 1: Re-read the finished page against the approved design**

Confirm manually:
- top row contains exactly four state cards
- quickstart is to the right of personal credentials on desktop
- security advice is gone
- integration choice is gone

**Step 2: Re-run the final verification suite**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/settings-page.test.tsx src/test/app.test.tsx
pnpm exec tsc -p apps/web/tsconfig.json --noEmit
pnpm exec playwright test -c apps/web/playwright.config.ts apps/web/e2e/smoke.spec.ts
```

Expected: all PASS.

**Step 3: Prepare final handoff notes**

In the final summary, include:
- removed modules: `安全建议`, `接入方式`
- new top-card metrics: `总密钥 / 活跃密钥 / 从未使用 / 已吊销`
- quickstart now sits in the right column
- existing create/reveal/revoke logic was preserved

**Step 4: Optional final cleanup commit if verification forces a tiny fix**

Only if needed:

```bash
git status --short
git add apps/web/src/features/settings/ApiKeysPage.tsx \
  apps/web/src/shared/styles/index.css \
  apps/web/src/test/integration/settings-page.test.tsx \
  apps/web/src/test/app.test.tsx \
  apps/web/e2e/smoke.spec.ts

git commit -F - <<'EOF'
Tighten the API key layout delivery after final verification

This follow-up captures only small fixes found while re-running the
final verification suite for the approved API key page redesign.

Constraint: Keep the follow-up limited to verification fallout
Confidence: medium
Scope-risk: narrow
Directive: Do not expand the feature scope in this cleanup commit
Tested: final targeted verification suite
Not-tested: new functionality beyond the verified API key layout refresh
EOF
```
