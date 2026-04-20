# Mailbox Account Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the `/accounts/list` and `/accounts/settings` placeholders with a mailbox-account bulk-management table and a global mailbox-account policy center.

**Architecture:** Keep the current route structure in `AppRoutes`, but swap the placeholder elements for two feature-scoped React pages under `apps/web/src/features/accounts/`. Use mock data and local component state for the first pass so the UI, interaction hierarchy, and destructive-action safeguards are stable before any backend contract is introduced. Reuse the existing workspace card/layout patterns and append only the account-specific styles needed in `shared/styles/index.css`.

**Tech Stack:** React 19, React Router 7, TypeScript, Vitest + Testing Library, Playwright, shared CSS in `apps/web/src/shared/styles/index.css`

---

### Task 1: Replace the account list placeholder with a real mailbox-account table shell

**Files:**
- Create: `apps/web/src/features/accounts/accountsMockData.ts`
- Create: `apps/web/src/features/accounts/AccountsListPage.tsx`
- Create: `apps/web/src/test/integration/accounts-pages.test.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx:162-183,344-347`

**Step 1: Write the failing integration test for the list page shell**

Add this first test to `apps/web/src/test/integration/accounts-pages.test.tsx`:

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { AccountsListPage } from "../../features/accounts/AccountsListPage";

function renderWithRouter(element: React.ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

describe("accounts pages", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the mailbox account bulk-management table instead of the placeholder copy", () => {
    renderWithRouter(<AccountsListPage />);

    expect(screen.getByRole("heading", { name: /^账号列表$/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/搜索 ID \/ 地址 \/ 标签 \/ 创建人/i)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^ID$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^地址$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^邮件数量$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^创建账号$/i })).toBeInTheDocument();
    expect(screen.queryByText(/账号列表先以占位页承接/i)).not.toBeInTheDocument();
  });
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/accounts-pages.test.tsx
```

Expected: FAIL because `AccountsListPage` does not exist yet.

**Step 3: Add mock data and the minimal list page implementation**

Create `apps/web/src/features/accounts/accountsMockData.ts`:

```ts
export type MailboxAccountStatus = "启用" | "停用" | "已归档" | "已软删除";

export type MailboxAccountRecord = {
  id: string;
  address: string;
  createdAt: string;
  tags: string[];
  status: MailboxAccountStatus;
  createdBy: string;
  lastActiveAt: string;
  mailCount: number;
  outboundCount: number;
  hasStoredMail: boolean;
  abnormal: boolean;
};

export const mailboxAccountsMockData: MailboxAccountRecord[] = [
  {
    id: "acct_001",
    address: "ops@wemail.dev",
    createdAt: "2026-04-11 09:12",
    tags: ["运营", "高优先级"],
    status: "启用",
    createdBy: "alice@wemail.dev",
    lastActiveAt: "10 分钟前",
    mailCount: 1248,
    outboundCount: 186,
    hasStoredMail: true,
    abnormal: false
  },
  {
    id: "acct_002",
    address: "review@wemail.dev",
    createdAt: "2026-04-03 18:24",
    tags: ["审核"],
    status: "停用",
    createdBy: "bob@wemail.dev",
    lastActiveAt: "3 天前",
    mailCount: 328,
    outboundCount: 0,
    hasStoredMail: true,
    abnormal: true
  },
  {
    id: "acct_003",
    address: "archive@wemail.dev",
    createdAt: "2026-03-28 11:02",
    tags: ["归档"],
    status: "已归档",
    createdBy: "carol@wemail.dev",
    lastActiveAt: "14 天前",
    mailCount: 87,
    outboundCount: 4,
    hasStoredMail: true,
    abnormal: false
  }
];
```

Create `apps/web/src/features/accounts/AccountsListPage.tsx`:

```tsx
import { mailboxAccountsMockData } from "./accountsMockData";

const listColumns = ["ID", "地址", "创建时间", "标签", "状态", "创建人", "最近活跃", "邮件数量", "发件数量"] as const;

export function AccountsListPage() {
  return (
    <main className="workspace-grid accounts-page-grid">
      <section className="panel workspace-card page-panel accounts-surface-card">
        <div className="workspace-card-header">
          <div className="accounts-page-copy">
            <p className="panel-kicker">账号中心</p>
            <h2>账号列表</h2>
            <p className="section-copy">按邮箱账号维度搜索、筛选并准备批量管理动作。</p>
          </div>
          <div className="accounts-toolbar-actions">
            <button className="workspace-action-button secondary" type="button">
              导出
            </button>
            <button className="workspace-action-button secondary" type="button">
              刷新
            </button>
            <button className="workspace-action-button primary" type="button">
              创建账号
            </button>
          </div>
        </div>

        <div className="accounts-toolbar">
          <input aria-label="账号搜索" placeholder="搜索 ID / 地址 / 标签 / 创建人" type="search" />
          <select aria-label="按状态筛选账号" defaultValue="all">
            <option value="all">全部状态</option>
            <option value="enabled">启用</option>
            <option value="disabled">停用</option>
            <option value="archived">已归档</option>
            <option value="softDeleted">已软删除</option>
          </select>
          <select aria-label="按标签筛选账号" defaultValue="all">
            <option value="all">全部标签</option>
            <option value="ops">运营</option>
            <option value="review">审核</option>
            <option value="archive">归档</option>
          </select>
          <button className="workspace-action-button ghost" type="button">
            仅看异常
          </button>
          <button className="workspace-action-button ghost" type="button">
            仅看长期不活跃
          </button>
        </div>

        <div className="accounts-table-shell">
          <table className="accounts-table">
            <thead>
              <tr>
                <th scope="col">
                  <input aria-label="全选账号" type="checkbox" />
                </th>
                {listColumns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {mailboxAccountsMockData.map((account) => (
                <tr key={account.id}>
                  <td>
                    <input aria-label={`选择账号 ${account.address}`} type="checkbox" />
                  </td>
                  <td>{account.id}</td>
                  <td>{account.address}</td>
                  <td>{account.createdAt}</td>
                  <td>{account.tags.join(" / ")}</td>
                  <td>{account.status}</td>
                  <td>{account.createdBy}</td>
                  <td>{account.lastActiveAt}</td>
                  <td>{account.mailCount}</td>
                  <td>{account.outboundCount}</td>
                  <td>
                    <button className="workspace-action-button ghost" type="button">
                      更多操作
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
```

Update `apps/web/src/app/AppRoutes.tsx`:

```tsx
import { AccountsListPage } from "../features/accounts/AccountsListPage";
```

Then replace the placeholder element:

```tsx
const accountsListPage = <AccountsListPage />;
```

Leave `/accounts/create` and `/accounts/settings` untouched in this task.

**Step 4: Run the test to verify it passes**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/accounts-pages.test.tsx
```

Expected: PASS with 1 passing test.

**Step 5: Commit**

```bash
git add apps/web/src/features/accounts/accountsMockData.ts \
  apps/web/src/features/accounts/AccountsListPage.tsx \
  apps/web/src/test/integration/accounts-pages.test.tsx \
  apps/web/src/app/AppRoutes.tsx

git commit -F - <<'EOF'
Establish the mailbox account list as a real management surface

This replaces the placeholder account list route with a concrete
mailbox-account table shell so later bulk-management work has a
real page structure to build on.

Constraint: Must keep /accounts/list wired through the existing AppRoutes structure
Rejected: Extend WorkspacePlaceholderPage again | would keep the route in a dead-end placeholder state
Confidence: high
Scope-risk: narrow
Directive: Keep account-list concerns local to the accounts feature instead of growing AppRoutes further
Tested: vitest run src/test/integration/accounts-pages.test.tsx
Not-tested: destructive bulk actions, settings page, Playwright smoke
EOF
```

### Task 2: Add multi-select and guarded bulk action flows to the list page

**Files:**
- Modify: `apps/web/src/features/accounts/AccountsListPage.tsx`
- Modify: `apps/web/src/features/accounts/accountsMockData.ts`
- Modify: `apps/web/src/test/integration/accounts-pages.test.tsx`

**Step 1: Write the failing test for selection, bulk actions, and hard-delete guardrails**

Append this test to `apps/web/src/test/integration/accounts-pages.test.tsx`:

```tsx
import userEvent from "@testing-library/user-event";

it("shows bulk actions after selection and requires a confirmation phrase for hard delete", async () => {
  const user = userEvent.setup();
  renderWithRouter(<AccountsListPage />);

  await user.click(screen.getByRole("checkbox", { name: /选择账号 ops@wemail.dev/i }));
  await user.click(screen.getByRole("checkbox", { name: /选择账号 review@wemail.dev/i }));

  expect(screen.getByText(/已选择 2 个账号/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /批量启用/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /批量停用/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /批量归档/i })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /更多操作/i }));
  await user.click(screen.getByRole("button", { name: /批量彻底删除/i }));

  expect(screen.getByRole("dialog", { name: /确认彻底删除/i })).toBeInTheDocument();
  expect(screen.getByText(/DELETE 2 ACCOUNTS/i)).toBeInTheDocument();

  const confirmButton = screen.getByRole("button", { name: /确认彻底删除/i });
  expect(confirmButton).toBeDisabled();

  await user.type(screen.getByLabelText(/确认词/i), "DELETE 2 ACCOUNTS");
  expect(confirmButton).toBeEnabled();
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/accounts-pages.test.tsx
```

Expected: FAIL because the bulk action bar and confirmation dialog do not exist yet.

**Step 3: Implement the minimal selection and destructive-action behavior**

Update `apps/web/src/features/accounts/AccountsListPage.tsx` to:

- Keep `const [accounts, setAccounts] = useState(mailboxAccountsMockData);`
- Track `selectedIds`
- Show a bulk action bar when `selectedIds.length > 0`
- Add:
  - `批量启用`
  - `批量停用`
  - `批量归档`
  - `更多操作`
- Inside “更多操作”, expose:
  - `批量软删除`
  - `批量彻底删除`
- For hard delete, open a dialog with a required phrase:
  - `DELETE ${selectedCount} ACCOUNTS`

Use this implementation skeleton:

```tsx
const [accounts, setAccounts] = useState(mailboxAccountsMockData);
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [dangerMenuOpen, setDangerMenuOpen] = useState(false);
const [pendingAction, setPendingAction] = useState<null | "soft-delete" | "hard-delete">(null);
const [confirmPhrase, setConfirmPhrase] = useState("");

const selectedAccounts = accounts.filter((account) => selectedIds.includes(account.id));
const hardDeletePhrase = `DELETE ${selectedIds.length} ACCOUNTS`;

function toggleSelection(accountId: string) {
  setSelectedIds((current) => (current.includes(accountId) ? current.filter((id) => id !== accountId) : [...current, accountId]));
}

function runBulkStatus(status: MailboxAccountStatus) {
  setAccounts((current) =>
    current.map((account) => (selectedIds.includes(account.id) ? { ...account, status } : account))
  );
}

function runSoftDelete() {
  setAccounts((current) =>
    current.map((account) => (selectedIds.includes(account.id) ? { ...account, status: "已软删除" } : account))
  );
  setPendingAction(null);
  setDangerMenuOpen(false);
}

function runHardDelete() {
  if (confirmPhrase !== hardDeletePhrase) return;
  setAccounts((current) => current.filter((account) => !selectedIds.includes(account.id)));
  setSelectedIds([]);
  setConfirmPhrase("");
  setPendingAction(null);
  setDangerMenuOpen(false);
}
```

Render the bar and dialog with stable accessibility labels:

```tsx
<section aria-label="账号批量操作条" className="accounts-bulk-bar">
  <strong>{`已选择 ${selectedIds.length} 个账号`}</strong>
```

```tsx
<section aria-labelledby="accounts-hard-delete-title" aria-modal="true" className="workspace-dialog panel" role="dialog">
  <h3 id="accounts-hard-delete-title">确认彻底删除</h3>
  <label>
    确认词
    <input aria-label="确认词" value={confirmPhrase} onChange={(event) => setConfirmPhrase(event.target.value)} />
  </label>
```

Keep the UI mock-first: update local state only, no backend calls yet.

**Step 4: Run the test to verify it passes**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/accounts-pages.test.tsx
```

Expected: PASS with 2 passing tests.

**Step 5: Commit**

```bash
git add apps/web/src/features/accounts/AccountsListPage.tsx \
  apps/web/src/features/accounts/accountsMockData.ts \
  apps/web/src/test/integration/accounts-pages.test.tsx

git commit -F - <<'EOF'
Make bulk mailbox-account actions explicit and safely gated

This adds the first real interaction layer to the account list by
supporting multi-select, batch status changes, and a deliberately
guarded hard-delete flow.

Constraint: Dangerous actions must be visually separated from ordinary batch actions
Rejected: Put hard delete beside enable/disable in the primary action row | too easy to misfire
Confidence: high
Scope-risk: moderate
Directive: Keep hard-delete confirmation phrase logic close to the dialog until a shared destructive-action pattern emerges
Tested: vitest run src/test/integration/accounts-pages.test.tsx
Not-tested: route-level App rendering, Playwright smoke, backend persistence
EOF
```

### Task 3: Replace the account settings placeholder with a global mailbox-policy center

**Files:**
- Create: `apps/web/src/features/accounts/AccountsSettingsPage.tsx`
- Modify: `apps/web/src/features/accounts/accountsMockData.ts`
- Modify: `apps/web/src/app/AppRoutes.tsx:208-228,347`
- Modify: `apps/web/src/test/integration/accounts-pages.test.tsx`

**Step 1: Write the failing test for the settings center**

Append this test to `apps/web/src/test/integration/accounts-pages.test.tsx`:

```tsx
import { AccountsSettingsPage } from "../../features/accounts/AccountsSettingsPage";

it("renders the global mailbox-account settings center with independent save controls", async () => {
  const user = userEvent.setup();
  renderWithRouter(<AccountsSettingsPage />);

  expect(screen.getByRole("heading", { name: /^账号设置$/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /默认创建规则/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /生命周期规则/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /批量操作保护/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /当前策略摘要/i })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /保存默认创建规则/i }));
  expect(screen.getByText(/默认创建规则已保存/i)).toBeInTheDocument();

  await user.click(screen.getByLabelText(/允许彻底删除/i));
  await user.click(screen.getByRole("button", { name: /保存生命周期规则/i }));
  expect(screen.getByRole("dialog", { name: /确认危险策略变更/i })).toBeInTheDocument();
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/accounts-pages.test.tsx
```

Expected: FAIL because `AccountsSettingsPage` does not exist yet.

**Step 3: Implement the minimal settings page and route wiring**

Extend `apps/web/src/features/accounts/accountsMockData.ts`:

```ts
export const mailboxAccountPolicyMock = {
  creation: {
    defaultTagsEnabled: true,
    defaultTags: "运营, 高优先级",
    allowCreationOverride: true,
    defaultStatus: "启用",
    requireCreatorNote: false
  },
  lifecycle: {
    inactiveDays: 30,
    inactiveAction: "自动归档",
    softDeleteRetentionDays: 30,
    allowHardDelete: false,
    requireSoftDeleteBeforeHardDelete: true
  },
  protection: {
    confirmStandardBulkActions: true,
    standardBulkLimit: 100,
    requireDangerPhrase: true,
    hardDeleteLimit: 20,
    auditLoggingEnabled: true
  },
  lastUpdatedLabel: "2026-04-17 22:30"
} as const;
```

Create `apps/web/src/features/accounts/AccountsSettingsPage.tsx`:

```tsx
import { useState } from "react";

import { mailboxAccountPolicyMock } from "./accountsMockData";

export function AccountsSettingsPage() {
  const [creationSaved, setCreationSaved] = useState(false);
  const [lifecycleSaved, setLifecycleSaved] = useState(false);
  const [protectionSaved, setProtectionSaved] = useState(false);
  const [allowHardDelete, setAllowHardDelete] = useState(mailboxAccountPolicyMock.lifecycle.allowHardDelete);
  const [showDangerConfirm, setShowDangerConfirm] = useState(false);

  return (
    <main className="workspace-grid accounts-settings-grid">
      <div className="accounts-settings-primary">
        <section className="panel workspace-card page-panel accounts-settings-card">
          <div className="accounts-page-copy">
            <p className="panel-kicker">账号中心</p>
            <h2>账号设置</h2>
            <p className="section-copy">为所有邮箱账号定义默认创建规则、生命周期策略与批量操作保护。</p>
          </div>
        </section>

        <section className="panel workspace-card page-panel accounts-settings-card">
          <p className="panel-kicker">创建规则</p>
          <h3>默认创建规则</h3>
          <label className="checkbox-row">
            <input defaultChecked={mailboxAccountPolicyMock.creation.defaultTagsEnabled} type="checkbox" />
            自动附加默认标签
          </label>
          <label>
            默认标签
            <input defaultValue={mailboxAccountPolicyMock.creation.defaultTags} />
          </label>
          <button className="workspace-action-button primary" onClick={() => setCreationSaved(true)} type="button">
            保存默认创建规则
          </button>
          {creationSaved ? <p role="status">默认创建规则已保存</p> : null}
        </section>

        <section className="panel workspace-card page-panel accounts-settings-card">
          <p className="panel-kicker">生命周期</p>
          <h3>生命周期规则</h3>
          <label>
            不活跃阈值（天）
            <input defaultValue={mailboxAccountPolicyMock.lifecycle.inactiveDays} type="number" />
          </label>
          <label className="checkbox-row">
            <input checked={allowHardDelete} onChange={(event) => setAllowHardDelete(event.target.checked)} type="checkbox" aria-label="允许彻底删除" />
            允许彻底删除
          </label>
          <button
            className="workspace-action-button primary"
            onClick={() => (allowHardDelete ? setShowDangerConfirm(true) : setLifecycleSaved(true))}
            type="button"
          >
            保存生命周期规则
          </button>
          {lifecycleSaved ? <p role="status">生命周期规则已保存</p> : null}
        </section>

        <section className="panel workspace-card page-panel accounts-settings-card">
          <p className="panel-kicker">保护策略</p>
          <h3>批量操作保护</h3>
          <label className="checkbox-row">
            <input defaultChecked={mailboxAccountPolicyMock.protection.confirmStandardBulkActions} type="checkbox" />
            普通批量操作显示确认弹窗
          </label>
          <label>
            单次彻底删除上限
            <input defaultValue={mailboxAccountPolicyMock.protection.hardDeleteLimit} type="number" />
          </label>
          <button className="workspace-action-button primary" onClick={() => setProtectionSaved(true)} type="button">
            保存批量操作保护
          </button>
          {protectionSaved ? <p role="status">批量操作保护已保存</p> : null}
        </section>
      </div>

      <aside className="accounts-settings-summary panel workspace-card page-panel">
        <p className="panel-kicker">策略摘要</p>
        <h3>当前策略摘要</h3>
        <div className="accounts-summary-list">
          <article className="accounts-summary-row">
            <strong>默认状态</strong>
            <span>{mailboxAccountPolicyMock.creation.defaultStatus}</span>
          </article>
          <article className="accounts-summary-row">
            <strong>软删除保留期</strong>
            <span>{`${mailboxAccountPolicyMock.lifecycle.softDeleteRetentionDays} 天`}</span>
          </article>
          <article className="accounts-summary-row">
            <strong>危险操作保护</strong>
            <span>{mailboxAccountPolicyMock.protection.requireDangerPhrase ? "确认词 + 二次确认" : "仅确认弹窗"}</span>
          </article>
          <article className="accounts-summary-row">
            <strong>最近更新时间</strong>
            <span>{mailboxAccountPolicyMock.lastUpdatedLabel}</span>
          </article>
        </div>
      </aside>

      {showDangerConfirm ? (
        <section aria-labelledby="accounts-danger-policy-title" aria-modal="true" className="workspace-dialog panel" role="dialog">
          <h3 id="accounts-danger-policy-title">确认危险策略变更</h3>
          <p className="section-copy">开启“允许彻底删除”会让高风险批量动作可用，请确认这是有意为之。</p>
          <div className="workspace-dialog-actions">
            <button className="workspace-action-button secondary" onClick={() => setShowDangerConfirm(false)} type="button">
              取消
            </button>
            <button
              className="workspace-action-button primary"
              onClick={() => {
                setShowDangerConfirm(false);
                setLifecycleSaved(true);
              }}
              type="button"
            >
              确认危险策略变更
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
```

Update `apps/web/src/app/AppRoutes.tsx`:

```tsx
import { AccountsSettingsPage } from "../features/accounts/AccountsSettingsPage";
```

Replace the placeholder:

```tsx
const accountsSettingsPage = <AccountsSettingsPage />;
```

**Step 4: Run the test to verify it passes**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/accounts-pages.test.tsx
```

Expected: PASS with 3 passing tests.

**Step 5: Commit**

```bash
git add apps/web/src/features/accounts/AccountsSettingsPage.tsx \
  apps/web/src/features/accounts/accountsMockData.ts \
  apps/web/src/app/AppRoutes.tsx \
  apps/web/src/test/integration/accounts-pages.test.tsx

git commit -F - <<'EOF'
Turn account settings into a global mailbox-policy center

This replaces the account settings placeholder with a page that
owns creation rules, lifecycle policy, and batch-operation
protections for all mailbox accounts.

Constraint: /accounts/settings must remain a global settings center rather than a single-account editor
Rejected: Start from per-account configuration UI | conflicts with the approved product direction
Confidence: high
Scope-risk: moderate
Directive: Preserve the separation of concerns: list page executes actions, settings page defines policy
Tested: vitest run src/test/integration/accounts-pages.test.tsx
Not-tested: App-level route rendering, Playwright smoke, backend persistence
EOF
```

### Task 4: Apply account-specific styling and route-level verification

**Files:**
- Modify: `apps/web/src/shared/styles/index.css:1898-2185`
- Modify: `apps/web/src/test/app.test.tsx`
- Modify: `apps/web/e2e/smoke.spec.ts`

**Step 1: Write the failing route-level and smoke assertions**

In `apps/web/src/test/app.test.tsx`, add a member-route assertion near the existing authenticated member tests:

```tsx
it("renders the mailbox account pages instead of the old placeholder routes", async () => {
  window.history.pushState({}, "", "/accounts/list");
  vi.restoreAllMocks();
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

    if (url.endsWith("/auth/session")) {
      return jsonResponse({
        user: {
          id: "member-1",
          email: "member@example.com",
          role: "member",
          createdAt: "2026-04-08T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      });
    }

    if (url.endsWith("/api/mailboxes")) return jsonResponse({ mailboxes: [] });
    if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
    if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: null });
    if (url.endsWith("/admin/users")) return jsonResponse({ users: [] });
    if (url.endsWith("/admin/invites")) return jsonResponse({ invites: [] });
    if (url.endsWith("/admin/features")) {
      return jsonResponse({
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      });
    }
    if (url.includes("/admin/quotas/")) return jsonResponse({ quota: null });
    if (url.endsWith("/admin/mailboxes")) return jsonResponse({ mailboxes: [] });
    return jsonResponse({});
  });

  render(<App />);

  expect(await screen.findByRole("heading", { name: /^账号列表$/i })).toBeInTheDocument();
  expect(screen.queryByText(/账号列表先以占位页承接/i)).not.toBeInTheDocument();
});
```

In `apps/web/e2e/smoke.spec.ts`, add two expectations to the authenticated member flow:

```ts
await sidebar.getByRole("link", { name: /^账号(?:\\s|$)/i }).click();
await expect(page.getByRole("heading", { name: /^账号列表$/i })).toBeVisible();
await expect(page.getByText(/已选择 2 个账号/i)).toHaveCount(0);
```

Also add a second route check:

```ts
await page.goto("/accounts/settings");
await expect(page.getByRole("heading", { name: /^账号设置$/i })).toBeVisible();
await expect(page.getByRole("heading", { name: /当前策略摘要/i })).toBeVisible();
```

**Step 2: Run the route and smoke tests to verify they fail**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/app.test.tsx
pnpm exec playwright test -c apps/web/playwright.config.ts apps/web/e2e/smoke.spec.ts
```

Expected: FAIL because the new layout/styling hooks and smoke coverage are not in place yet.

**Step 3: Add the account page styles and any missing route wiring polish**

Append account-specific styles to `apps/web/src/shared/styles/index.css` near the placeholder/integration section:

```css
.accounts-page-grid,
.accounts-settings-grid {
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
}

.accounts-settings-grid {
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
}

.accounts-page-copy,
.accounts-settings-primary,
.accounts-summary-list,
.accounts-toolbar,
.accounts-toolbar-actions {
  display: grid;
  gap: 12px;
}

.accounts-toolbar {
  grid-template-columns: minmax(220px, 1.4fr) repeat(2, minmax(160px, 0.8fr)) auto auto;
  align-items: center;
}

.accounts-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.accounts-table-shell {
  overflow: auto;
  border-radius: 24px;
  border: 1px solid var(--border);
}

.accounts-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1160px;
}

.accounts-table th,
.accounts-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}

.accounts-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.accounts-tag,
.accounts-status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
}

.accounts-bulk-bar,
.accounts-settings-card,
.accounts-settings-summary,
.accounts-summary-row {
  display: grid;
  gap: 12px;
}

.accounts-bulk-bar {
  grid-template-columns: minmax(0, 1fr) auto auto auto auto;
  align-items: center;
  padding: 16px 18px;
  border-radius: 24px;
  border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
  background: color-mix(in srgb, var(--accent-soft) 46%, var(--surface));
}

@media (max-width: 960px) {
  .accounts-settings-grid,
  .accounts-toolbar,
  .accounts-bulk-bar {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

If needed, add small render helpers in `AccountsListPage.tsx` so tags and statuses use the new classes:

```tsx
<td>
  <div className="accounts-tag-row">
    {account.tags.map((tag) => (
      <span className="accounts-tag" key={tag}>
        {tag}
      </span>
    ))}
  </div>
</td>
<td>
  <span className="accounts-status-pill">{account.status}</span>
</td>
```

**Step 4: Run verification to confirm the route flow passes**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/accounts-pages.test.tsx src/test/app.test.tsx
pnpm exec tsc -p apps/web/tsconfig.json --noEmit
pnpm exec eslint apps/web/src/app/AppRoutes.tsx \
  apps/web/src/features/accounts/AccountsListPage.tsx \
  apps/web/src/features/accounts/AccountsSettingsPage.tsx \
  apps/web/src/features/accounts/accountsMockData.ts \
  apps/web/src/shared/styles/index.css \
  apps/web/src/test/integration/accounts-pages.test.tsx \
  apps/web/src/test/app.test.tsx \
  apps/web/e2e/smoke.spec.ts
pnpm exec playwright test -c apps/web/playwright.config.ts apps/web/e2e/smoke.spec.ts
```

Expected:

- Vitest: PASS
- TypeScript: PASS
- ESLint: PASS (ignore the CSS file in the command if ESLint warns that no config matches it)
- Playwright smoke: PASS

**Step 5: Commit**

```bash
git add apps/web/src/shared/styles/index.css \
  apps/web/src/test/app.test.tsx \
  apps/web/e2e/smoke.spec.ts \
  apps/web/src/features/accounts/AccountsListPage.tsx \
  apps/web/src/features/accounts/AccountsSettingsPage.tsx \
  apps/web/src/test/integration/accounts-pages.test.tsx

git commit -F - <<'EOF'
Finish the mailbox account pages with responsive styling and route verification

This completes the account-page redesign by styling the new
surfaces, locking route-level expectations, and proving the main
member flow in Playwright.

Constraint: Must fit the existing workspace visual system without adding new dependencies
Rejected: Create a page-local CSS file for the first pass | diverges from the current shared stylesheet pattern
Confidence: medium
Scope-risk: moderate
Directive: If account UI grows further, split shared account styles into a dedicated feature stylesheet only after multiple pages reuse the same selectors
Tested: vitest run src/test/integration/accounts-pages.test.tsx src/test/app.test.tsx; tsc --noEmit; eslint on touched TS files; Playwright smoke
Not-tested: real backend mutations, non-Chinese locale copy, large-table performance
EOF
```

### Task 5: Final cleanup and handoff verification

**Files:**
- Review only: `apps/web/src/app/AppRoutes.tsx`
- Review only: `apps/web/src/features/accounts/AccountsListPage.tsx`
- Review only: `apps/web/src/features/accounts/AccountsSettingsPage.tsx`
- Review only: `apps/web/src/test/integration/accounts-pages.test.tsx`
- Review only: `apps/web/e2e/smoke.spec.ts`

**Step 1: Re-read the finished pages against the approved design**

Check manually that the implementation still matches:

- `/accounts/list` = batch-management console, not overview dashboard
- `/accounts/settings` = global settings center, not single-account editor
- hard delete = separated from ordinary bulk actions

**Step 2: Run the full targeted verification suite one more time**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/accounts-pages.test.tsx src/test/app.test.tsx src/test/workspace-shell.test.ts
pnpm exec tsc -p apps/web/tsconfig.json --noEmit
pnpm exec playwright test -c apps/web/playwright.config.ts apps/web/e2e/smoke.spec.ts
```

Expected: all PASS.

**Step 3: Prepare handoff notes**

Record in the final summary:

- Which files were created
- Which placeholders were removed
- Which destructive-action safeguards are mock-only and still need backend enforcement
- Whether `/accounts/create` remains placeholder by design

**Step 4: Optional final commit if Task 4 changes required follow-up adjustments**

Only if there are uncommitted fixes:

```bash
git status --short
git add apps/web/src/app/AppRoutes.tsx \
  apps/web/src/features/accounts/AccountsListPage.tsx \
  apps/web/src/features/accounts/AccountsSettingsPage.tsx \
  apps/web/src/features/accounts/accountsMockData.ts \
  apps/web/src/shared/styles/index.css \
  apps/web/src/test/integration/accounts-pages.test.tsx \
  apps/web/src/test/app.test.tsx \
  apps/web/e2e/smoke.spec.ts
git commit -F - <<'EOF'
Tighten the mailbox account page delivery after final verification

This follow-up only captures cleanup found during the final review
and keeps the finished account-page delivery aligned with the
approved batch-management-first design.

Constraint: Keep follow-up scope limited to verification fallout
Confidence: medium
Scope-risk: narrow
Directive: Do not fold new product ideas into this follow-up commit
Tested: final targeted verification suite
Not-tested: new functionality beyond the verified account pages
EOF
```
