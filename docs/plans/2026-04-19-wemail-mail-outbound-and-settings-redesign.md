# WeMail Outbound and Mail Settings Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the standalone `/mail/unassigned` page, turn `/mail/outbound` into a record-centric outbound center with an integrated exceptions view, and replace `/mail/settings` with a rule-centric mail configuration page.

**Architecture:** Keep the existing mail section under the same `/mail/*` route family, but collapse the secondary nav to three entries: list, outbound, and settings. Rebuild outbound with feature-scoped mock data plus existing `outboundHistory` so the page can show real send history and a mock “异常 / 无匹配” lane without introducing backend changes. Rebuild mail settings as a local-state configuration shell that prioritizes sending rules and notification/routing strategy, while redirecting `/mail/unassigned` to `/mail/outbound?view=exceptions`.

**Tech Stack:** React 19, React Router 7, TypeScript, Vitest + Testing Library, Playwright, shared CSS in `apps/web/src/shared/styles/index.css`

---

### Task 1: Collapse the mail secondary nav and redirect `/mail/unassigned`

**Files:**
- Modify: `apps/web/src/app/workspaceShell.ts:88-99`
- Modify: `apps/web/src/app/AppRoutes.tsx:2,168-289`
- Modify: `apps/web/src/test/workspace-shell.test.ts:20-47`
- Modify: `apps/web/e2e/smoke.spec.ts:110-145`
- Create: `apps/web/src/test/integration/outbound-page.test.tsx`

**Step 1: Write the failing tests for the new nav and redirect**

Update `apps/web/src/test/workspace-shell.test.ts` so the mail secondary nav assertions become:

```ts
expect(shell.secondaryNav.map((item) => item.label)).toEqual(["邮件列表", "发件箱", "邮件设置"]);
expect(shell.railSections).toEqual([
  {
    title: "工作台",
    items: expect.arrayContaining([
      expect.objectContaining({
        label: "邮件",
        hint: "邮件列表 · 发件箱 · 邮件设置"
      })
    ])
  },
  expect.anything()
]);
```

Create `apps/web/src/test/integration/outbound-page.test.tsx` with two tests:

```tsx
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

function mockMailShell() {
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

    if (url.endsWith("/auth/session")) {
      return jsonResponse({
        user: { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-08T00:00:00.000Z" },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      });
    }

    if (url.endsWith("/api/mailboxes")) {
      return jsonResponse({
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
      });
    }

    if (url.endsWith("/api/messages?mailboxId=box-1")) return jsonResponse({ messages: [] });
    if (url.endsWith("/api/outbound?mailboxId=box-1")) {
      return jsonResponse({
        messages: [
          {
            id: "out-1",
            mailboxId: "box-1",
            toAddress: "user@example.com",
            subject: "Welcome",
            status: "sent",
            errorText: null,
            createdAt: "2026-04-08T00:00:00.000Z"
          }
        ]
      });
    }

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
    if (url.includes("/admin/quotas/")) {
      return jsonResponse({
        quota: {
          userId: "member-1",
          dailyLimit: 20,
          sendsToday: 0,
          disabled: false,
          updatedAt: "2026-04-08T00:00:00.000Z"
        }
      });
    }
    if (url.endsWith("/admin/mailboxes")) return jsonResponse({ mailboxes: [] });

    return jsonResponse({});
  });
}

describe("outbound page integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    mockMailShell();
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("redirects /mail/unassigned into the outbound exceptions view", async () => {
    window.history.pushState({}, "", "/mail/unassigned");
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^发件箱$/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/mail/outbound");
    });
    expect(window.location.search).toContain("view=exceptions");
    expect(screen.getByRole("button", { name: /^异常 \/ 无匹配$/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("replaces the old outbound placeholder with a record-centric outbound workspace", async () => {
    window.history.pushState({}, "", "/mail/outbound");
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^发件箱$/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/搜索收件人 \/ 主题 \/ 发件结果/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^新建发送$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^异常 \/ 无匹配$/i })).toBeInTheDocument();
    expect(screen.queryByText(/发件箱入口已占位/i)).not.toBeInTheDocument();
  });
});
```

Update the authenticated-shell smoke test in `apps/web/e2e/smoke.spec.ts` so it asserts the mail secondary nav does **not** show `无收件人邮件`, then add a direct-route smoke assertion like this:

```ts
test("shows the outbound record center on its direct route for an authenticated member", async ({ page }) => {
  test.setTimeout(60000);
  await mockAuthenticatedMember(page);

  await page.goto("/mail/outbound?view=exceptions");
  await expect(page.getByRole("heading", { name: /^发件箱$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^异常 \/ 无匹配$/i })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^新建发送$/i })).toBeVisible();
});
```

**Step 2: Run the tests to verify they fail**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/workspace-shell.test.ts src/test/integration/outbound-page.test.tsx
pnpm exec playwright test -c apps/web/playwright.config.ts --grep "shared access shell|outbound record center"
```

Expected: FAIL because `workspaceShell` still exposes `无收件人邮件`, `/mail/unassigned` still renders a placeholder, and `/mail/outbound` is still a placeholder page.

**Step 3: Write the minimal routing and nav implementation**

Update `apps/web/src/app/workspaceShell.ts` so the mail `children` list is exactly:

```ts
children: [
  { label: "邮件列表", to: "/mail/list" },
  { label: "发件箱", to: "/mail/outbound" },
  { label: "邮件设置", to: "/mail/settings" }
]
```

In `apps/web/src/app/AppRoutes.tsx`, import `Navigate` and replace the old unassigned placeholder route with:

```tsx
<Route path="/mail/unassigned" element={<Navigate replace to="/mail/outbound?view=exceptions" />} />
```

Leave `mailOutboundPage` and `mailSettingsPage` as placeholders for now; the point of this task is to lock the new IA and redirect behavior.

**Step 4: Run the tests to verify they pass**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/workspace-shell.test.ts src/test/integration/outbound-page.test.tsx
pnpm exec playwright test -c apps/web/playwright.config.ts --grep "shared access shell|outbound record center"
```

Expected: The nav and redirect assertions pass, but the direct outbound page test should still fail because the outbound page itself is not built yet. If the outbound test still fails only on page structure, that is the correct intermediate state.

**Step 5: Commit the IA and redirect change**

```bash
git add   apps/web/src/app/workspaceShell.ts   apps/web/src/app/AppRoutes.tsx   apps/web/src/test/workspace-shell.test.ts   apps/web/src/test/integration/outbound-page.test.tsx   apps/web/e2e/smoke.spec.ts

git commit -F - <<'EOF'
Collapse the mail IA before rebuilding outbound and settings

The redesign removes the standalone unassigned-mail page, so the mail nav and
routing now need to collapse to three destinations before the new outbound and
settings pages are implemented.

Constraint: Existing /mail/unassigned links must continue to resolve during the transition
Rejected: Keep the fourth mail tab until the new outbound page ships | preserves the IA this redesign is explicitly removing
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep /mail/unassigned as a redirect only; do not resurrect it as a real page
Tested: Targeted Vitest nav/redirect checks, targeted Playwright shell/outbound checks
Not-tested: Passing outbound page implementation
EOF
```

### Task 2: Replace the outbound placeholder with a record-centric outbound workspace shell

**Files:**
- Create: `apps/web/src/features/outbound/outboundMockData.ts`
- Create: `apps/web/src/features/outbound/OutboundPage.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx:190-209,287-288`
- Modify: `apps/web/src/test/integration/outbound-page.test.tsx`
- Modify: `apps/web/src/shared/styles/index.css`

**Step 1: Extend the outbound integration test to define the real page shell**

Add this test to `apps/web/src/test/integration/outbound-page.test.tsx`:

```tsx
it("renders a send-history-first outbound workspace with a detail pane", async () => {
  window.history.pushState({}, "", "/mail/outbound");
  render(<App />);

  expect(await screen.findByRole("heading", { name: /^发件箱$/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/搜索收件人 \/ 主题 \/ 发件结果/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^全部$/i })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: /^已发送$/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^失败$/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^异常 \/ 无匹配$/i })).toBeInTheDocument();
  expect(screen.getByText(/user@example.com/i)).toBeInTheDocument();
  expect(screen.getByText(/已发送/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^新建发送$/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^重发$/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^复制 payload$/i })).toBeInTheDocument();
  expect(screen.queryByText(/发件箱入口已占位/i)).not.toBeInTheDocument();
});
```

**Step 2: Run the outbound integration test to verify it fails**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/outbound-page.test.tsx
```

Expected: FAIL because the outbound placeholder has none of the real controls or detail actions.

**Step 3: Write the minimal outbound shell implementation**

Create `apps/web/src/features/outbound/outboundMockData.ts`:

```ts
import type { OutboundHistoryItem } from "../inbox/types";

export type OutboundRecordStatus = "已发送" | "失败" | "异常 / 无匹配";

export type OutboundRecord = {
  id: string;
  source: "history" | "exception";
  toAddress: string;
  subject: string;
  status: OutboundRecordStatus;
  summary: string;
  createdAtLabel: string;
  payloadPreview: string;
  failureReason: string | null;
};

export const outboundExceptionMockData: OutboundRecord[] = [
  {
    id: "exception-1",
    source: "exception",
    toAddress: "unknown+signup@example.com",
    subject: "Magic link fallback",
    status: "异常 / 无匹配",
    summary: "未命中邮箱路由，等待人工处理。",
    createdAtLabel: "5 分钟前",
    payloadPreview: '{"to":"unknown+signup@example.com","subject":"Magic link fallback"}',
    failureReason: "未匹配到邮箱或路由策略"
  }
];

export function buildOutboundRecords(history: OutboundHistoryItem[]) {
  const historyRecords: OutboundRecord[] = history.map((item) => ({
    id: item.id,
    source: "history",
    toAddress: item.toAddress,
    subject: item.subject,
    status: item.status === "failed" ? "失败" : "已发送",
    summary: item.errorText ?? "已发送到收件人。",
    createdAtLabel: new Date(item.createdAt).toLocaleString("zh-CN"),
    payloadPreview: JSON.stringify({ toAddress: item.toAddress, subject: item.subject }),
    failureReason: item.errorText
  }));

  return [...outboundExceptionMockData, ...historyRecords];
}
```

Create `apps/web/src/features/outbound/OutboundPage.tsx`:

```tsx
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { OutboundHistoryItem } from "../inbox/types";
import { buildOutboundRecords, type OutboundRecord } from "./outboundMockData";

type OutboundFilter = "all" | "sent" | "failed" | "exceptions";

type OutboundPageProps = {
  outboundHistory: OutboundHistoryItem[];
};

function matchFilter(record: OutboundRecord, filter: OutboundFilter) {
  if (filter === "sent") return record.status === "已发送";
  if (filter === "failed") return record.status === "失败";
  if (filter === "exceptions") return record.status === "异常 / 无匹配";
  return true;
}

export function OutboundPage({ outboundHistory }: OutboundPageProps) {
  const [searchParams] = useSearchParams();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const defaultFilter: OutboundFilter = searchParams.get("view") === "exceptions" ? "exceptions" : "all";
  const [filter, setFilter] = useState<OutboundFilter>(defaultFilter);

  const records = useMemo(() => buildOutboundRecords(outboundHistory), [outboundHistory]);
  const visibleRecords = useMemo(() => records.filter((record) => matchFilter(record, filter)), [filter, records]);
  const selectedRecord = visibleRecords.find((record) => record.id === (selectedRecordId ?? visibleRecords[0]?.id)) ?? visibleRecords[0] ?? null;

  return (
    <main className="workspace-grid outbound-page-grid">
      <section className="panel workspace-card outbound-toolbar-card">
        <div className="workspace-card-header">
          <div>
            <p className="panel-kicker">邮件中心</p>
            <h2>发件箱</h2>
          </div>
          <div className="outbound-toolbar-actions">
            <button className="workspace-action-button secondary" type="button">刷新</button>
            <button className="workspace-action-button primary" type="button">新建发送</button>
          </div>
        </div>
        <div className="outbound-toolbar-row">
          <input aria-label="发件箱搜索" placeholder="搜索收件人 / 主题 / 发件结果" type="search" />
          <div className="outbound-filter-row" role="toolbar" aria-label="发件箱状态筛选">
            <button aria-pressed={filter === "all"} className="workspace-action-button ghost" onClick={() => setFilter("all")} type="button">全部</button>
            <button aria-pressed={filter === "sent"} className="workspace-action-button ghost" onClick={() => setFilter("sent")} type="button">已发送</button>
            <button aria-pressed={filter === "failed"} className="workspace-action-button ghost" onClick={() => setFilter("failed")} type="button">失败</button>
            <button aria-pressed={filter === "exceptions"} className="workspace-action-button ghost" onClick={() => setFilter("exceptions")} type="button">异常 / 无匹配</button>
          </div>
        </div>
      </section>

      <section className="workspace-grid outbound-main-grid">
        <section className="panel workspace-card outbound-list-panel">
          {visibleRecords.map((record) => (
            <button
              key={record.id}
              className={record.id === selectedRecord?.id ? "outbound-record-item active" : "outbound-record-item"}
              onClick={() => setSelectedRecordId(record.id)}
              type="button"
            >
              <div className="outbound-record-item-top">
                <strong>{record.toAddress}</strong>
                <small>{record.createdAtLabel}</small>
              </div>
              <div className="outbound-record-item-meta">
                <span className="outbound-status-chip">{record.status}</span>
                <span>{record.subject}</span>
              </div>
              <p>{record.summary}</p>
            </button>
          ))}
        </section>

        <section className="panel workspace-card outbound-detail-panel">
          {selectedRecord ? (
            <>
              <div className="workspace-card-header">
                <div>
                  <p className="panel-kicker">记录详情</p>
                  <h2>{selectedRecord.subject}</h2>
                </div>
              </div>
              <div className="outbound-detail-grid">
                <p>收件人：{selectedRecord.toAddress}</p>
                <p>状态：{selectedRecord.status}</p>
                <p>结果：{selectedRecord.failureReason ?? "已发送"}</p>
                <pre>{selectedRecord.payloadPreview}</pre>
              </div>
              <div className="outbound-detail-actions">
                <button className="workspace-action-button primary" type="button">重发</button>
                <button className="workspace-action-button secondary" type="button">复制 payload</button>
                <button className="workspace-action-button ghost" type="button">查看原始详情</button>
              </div>
            </>
          ) : (
            <p className="empty-state">当前还没有发件记录。</p>
          )}
        </section>
      </section>
    </main>
  );
}
```

Update `apps/web/src/app/AppRoutes.tsx` to replace `mailOutboundPage` with:

```tsx
import { OutboundPage } from "../features/outbound/OutboundPage";

const mailOutboundPage = <OutboundPage outboundHistory={inbox.outboundHistory} />;
```

Add CSS classes for `.outbound-page-grid`, `.outbound-toolbar-row`, `.outbound-main-grid`, `.outbound-record-item`, `.outbound-status-chip`, and `.outbound-detail-actions` in `apps/web/src/shared/styles/index.css`.

**Step 4: Run the tests to verify the outbound shell passes**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/outbound-page.test.tsx
pnpm exec playwright test -c apps/web/playwright.config.ts --grep "outbound record center"
```

Expected: PASS for the outbound shell tests. The page should no longer reference placeholder copy.

**Step 5: Commit the outbound shell**

```bash
git add   apps/web/src/features/outbound/outboundMockData.ts   apps/web/src/features/outbound/OutboundPage.tsx   apps/web/src/app/AppRoutes.tsx   apps/web/src/test/integration/outbound-page.test.tsx   apps/web/src/shared/styles/index.css

git commit -F - <<'EOF'
Turn outbound into a record-first mail center

The outbound page now matches the approved IA: it leads with send history and
exception records instead of acting like a compose screen, while still keeping
send actions available.

Constraint: No new backend endpoint is available for exception records, so the first pass must mix existing outbound history with mock exception data
Rejected: Build the outbound page around a permanent compose form | breaks the approved record-center hierarchy
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Keep exception records visible in the same list system as normal outbound history
Tested: Targeted Vitest outbound integration, targeted Playwright outbound route smoke
Not-tested: Full web suite, compose drawer interaction
EOF
```

### Task 3: Add the compose drawer and make exception details actionable

**Files:**
- Create: `apps/web/src/features/outbound/OutboundComposeDrawer.tsx`
- Modify: `apps/web/src/features/outbound/OutboundPage.tsx`
- Modify: `apps/web/src/test/integration/outbound-page.test.tsx`
- Modify: `apps/web/src/shared/styles/index.css`

**Step 1: Write the failing outbound interaction tests**

Add these tests to `apps/web/src/test/integration/outbound-page.test.tsx`:

```tsx
import userEvent from "@testing-library/user-event";

it("opens a compose drawer instead of rendering a permanent send form", async () => {
  const user = userEvent.setup();
  window.history.pushState({}, "", "/mail/outbound");
  render(<App />);

  expect(await screen.findByRole("button", { name: /^新建发送$/i })).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: /^新建发送$/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /^新建发送$/i }));

  const dialog = await screen.findByRole("dialog", { name: /^新建发送$/i });
  expect(within(dialog).getByLabelText(/收件人/i)).toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: /^发送邮件$/i })).toBeInTheDocument();
});

it("shows exception-specific guidance when the exceptions view is selected", async () => {
  const user = userEvent.setup();
  window.history.pushState({}, "", "/mail/outbound?view=exceptions");
  render(<App />);

  expect(await screen.findByRole("button", { name: /^异常 \/ 无匹配$/i })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText(/未命中邮箱 \/ 路由的原因/i)).toBeInTheDocument();
  expect(screen.getByText(/后续处理建议/i)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /^复制 payload$/i }));
  expect(screen.getByText(/复制 payload/i)).toBeInTheDocument();
});
```

Wire a clipboard mock in the test file if needed:

```tsx
const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
```

**Step 2: Run the tests to verify they fail**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/outbound-page.test.tsx
```

Expected: FAIL because the compose drawer and exception-specific detail copy do not exist yet.

**Step 3: Add the compose drawer and detail-state behavior**

Create `apps/web/src/features/outbound/OutboundComposeDrawer.tsx`:

```tsx
import { X } from "lucide-react";
import type { FormEvent } from "react";

type OutboundComposeDrawerProps = {
  open: boolean;
  onClose: () => void;
  onSendMail: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function OutboundComposeDrawer({ open, onClose, onSendMail }: OutboundComposeDrawerProps) {
  if (!open) return null;

  return (
    <div className="workspace-drawer-backdrop" role="presentation">
      <section aria-labelledby="outbound-compose-title" aria-modal="true" className="workspace-drawer panel" role="dialog">
        <div className="workspace-dialog-header">
          <div>
            <p className="panel-kicker">发件箱</p>
            <h2 id="outbound-compose-title">新建发送</h2>
          </div>
          <button className="workspace-theme-toggle" onClick={onClose} type="button" aria-label="关闭新建发送抽屉">
            <X absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.9} />
          </button>
        </div>
        <form className="composer-form outbound-form" onSubmit={onSendMail}>
          <label>
            收件人
            <input name="toAddress" type="email" required />
          </label>
          <label>
            主题
            <input name="subject" required />
          </label>
          <label>
            正文
            <textarea name="bodyText" rows={8} required />
          </label>
          <button className="workspace-action-button primary" type="submit">发送邮件</button>
        </form>
      </section>
    </div>
  );
}
```

Update `apps/web/src/features/outbound/OutboundPage.tsx` to:

- add `onSendMail` to props
- keep `const [composeOpen, setComposeOpen] = useState(false)`
- open the drawer from the `新建发送` button
- render `<OutboundComposeDrawer open={composeOpen} onClose={() => setComposeOpen(false)} onSendMail={onSendMail} />`
- in the detail panel, branch exception records into copy like:

```tsx
{selectedRecord.status === "异常 / 无匹配" ? (
  <div className="outbound-detail-exception-copy">
    <h3>未命中邮箱 / 路由的原因</h3>
    <p>{selectedRecord.failureReason}</p>
    <h3>后续处理建议</h3>
    <p>检查收件地址映射、默认路由或改为人工补发。</p>
  </div>
) : null}
```

Also add a real payload copy action:

```tsx
<button className="workspace-action-button secondary" onClick={() => void navigator.clipboard.writeText(selectedRecord.payloadPreview)} type="button">
  复制 payload
</button>
```

Finally, pass `onSendMail={inbox.sendMail}` from `AppRoutes.tsx` into `<OutboundPage ... />`.

**Step 4: Run the tests to verify the interaction layer passes**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/outbound-page.test.tsx
pnpm exec playwright test -c apps/web/playwright.config.ts --grep "outbound record center"
```

Expected: PASS. The outbound page should now keep compose out of the main layout and make exception details actionable.

**Step 5: Commit the outbound interaction layer**

```bash
git add   apps/web/src/features/outbound/OutboundComposeDrawer.tsx   apps/web/src/features/outbound/OutboundPage.tsx   apps/web/src/app/AppRoutes.tsx   apps/web/src/test/integration/outbound-page.test.tsx   apps/web/src/shared/styles/index.css

git commit -F - <<'EOF'
Finish the outbound exception flow and compose drawer

The outbound page now keeps compose work behind a drawer while making
exception records practical to inspect and act on inside the same record
center.

Constraint: The current sendMail handler still comes from the existing inbox workspace hook
Rejected: Add a separate outbound send data layer in this pass | unnecessary scope before backend contracts change
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Keep compose secondary to record browsing and preserve the exception detail branch
Tested: Targeted Vitest outbound integration, targeted Playwright outbound route smoke
Not-tested: Full suite, manual browser QA
EOF
```

### Task 4: Replace the mail settings placeholder with the rule-centric settings center

**Files:**
- Create: `apps/web/src/features/settings/mailSettingsMockData.ts`
- Create: `apps/web/src/features/settings/MailSettingsPage.tsx`
- Create: `apps/web/src/test/integration/mail-settings-page.test.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx:212-231,289`
- Modify: `apps/web/e2e/smoke.spec.ts`
- Modify: `apps/web/src/shared/styles/index.css`

**Step 1: Write the failing mail-settings integration and smoke tests**

Create `apps/web/src/test/integration/mail-settings-page.test.tsx`:

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

describe("mail settings integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/mail/settings");
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/auth/session")) {
        return jsonResponse({
          user: { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-08T00:00:00.000Z" },
          featureToggles: {
            aiEnabled: true,
            telegramEnabled: true,
            outboundEnabled: true,
            mailboxCreationEnabled: true
          }
        });
      }

      if (url.endsWith("/api/mailboxes")) return jsonResponse({ mailboxes: [] });
      if (url.endsWith("/api/messages?mailboxId=box-1")) return jsonResponse({ messages: [] });
      if (url.endsWith("/api/outbound?mailboxId=box-1")) return jsonResponse({ messages: [] });
      if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
      if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: { chatId: "123456", enabled: true } });
      if (url.endsWith("/admin/users")) return jsonResponse({ users: [] });
      if (url.endsWith("/admin/invites")) return jsonResponse({ invites: [] });
      if (url.endsWith("/admin/features")) return jsonResponse({ featureToggles: { aiEnabled: true, telegramEnabled: true, outboundEnabled: true, mailboxCreationEnabled: true } });
      if (url.includes("/admin/quotas/")) return jsonResponse({ quota: { userId: "member-1", dailyLimit: 20, sendsToday: 0, disabled: false, updatedAt: "2026-04-08T00:00:00.000Z" } });
      if (url.endsWith("/admin/mailboxes")) return jsonResponse({ mailboxes: [] });

      return jsonResponse({});
    });
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("renders the rule-centric mail settings center instead of the placeholder cards", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^邮件设置$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^发件规则$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^通知与路由$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^当前策略摘要$/i })).toBeInTheDocument();
    expect(screen.getByText(/默认发件身份/i)).toBeInTheDocument();
    expect(screen.getByText(/Webhook 通知/i)).toBeInTheDocument();
    expect(screen.queryByText(/邮件设置先做占位/i)).not.toBeInTheDocument();
  });
});
```

Add a smoke test to `apps/web/e2e/smoke.spec.ts`:

```ts
test("shows the mail settings rule center on its direct route for an authenticated member", async ({ page }) => {
  test.setTimeout(60000);
  await mockAuthenticatedMember(page);

  await page.goto("/mail/settings");
  await expect(page.getByRole("heading", { name: /^邮件设置$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^发件规则$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^通知与路由$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^当前策略摘要$/i })).toBeVisible();
});
```

**Step 2: Run the tests to verify they fail**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/mail-settings-page.test.tsx
pnpm exec playwright test -c apps/web/playwright.config.ts --grep "mail settings rule center"
```

Expected: FAIL because `/mail/settings` still renders the placeholder page.

**Step 3: Build the mail settings rule center**

Create `apps/web/src/features/settings/mailSettingsMockData.ts`:

```ts
export const mailSettingsMockData = {
  senderRules: {
    defaultIdentity: "WeMail QA <qa@example.com>",
    defaultSignature: "Sent from WeMail QA",
    retryEnabled: true,
    retryPolicy: "失败后重试 2 次，间隔 5 分钟",
    failureRetention: "保留 30 天"
  },
  routing: {
    webhookEnabled: true,
    webhookEndpoint: "https://hooks.example.com/wemail",
    telegramEnabled: true,
    telegramChannel: "123456",
    failureAlerts: true,
    exceptionAlerts: true,
    exceptionStrategy: "异常 / 无匹配邮件进入发件箱异常视图"
  },
  workspaceDefaults: {
    defaultMailRoute: "/mail/outbound",
    outboundDefaultFilter: "异常 / 无匹配",
    expandExceptionsByDefault: true,
    listDensity: "comfortable"
  }
};
```

Create `apps/web/src/features/settings/MailSettingsPage.tsx`:

```tsx
import { mailSettingsMockData } from "./mailSettingsMockData";

export function MailSettingsPage() {
  const { senderRules, routing, workspaceDefaults } = mailSettingsMockData;

  return (
    <main className="workspace-grid mail-settings-grid">
      <section className="panel workspace-card mail-settings-main-panel">
        <div className="workspace-card-header">
          <div>
            <p className="panel-kicker">邮件中心</p>
            <h2>邮件设置</h2>
            <p className="section-copy">先定义默认发件规则，再配置失败告警、路由和工作台默认行为。</p>
          </div>
        </div>

        <section className="mail-settings-section">
          <div className="mail-settings-section-head">
            <h3>发件规则</h3>
            <p>定义默认发件身份、签名与失败重试策略。</p>
          </div>
          <div className="mail-settings-field-grid">
            <article className="mail-settings-field-card"><strong>默认发件身份</strong><span>{senderRules.defaultIdentity}</span></article>
            <article className="mail-settings-field-card"><strong>默认签名</strong><span>{senderRules.defaultSignature}</span></article>
            <article className="mail-settings-field-card"><strong>重试策略</strong><span>{senderRules.retryPolicy}</span></article>
            <article className="mail-settings-field-card"><strong>失败记录保留</strong><span>{senderRules.failureRetention}</span></article>
          </div>
        </section>

        <section className="mail-settings-section">
          <div className="mail-settings-section-head">
            <h3>通知与路由</h3>
            <p>配置 Webhook、Telegram 和异常邮件的默认流转方式。</p>
          </div>
          <div className="mail-settings-field-grid">
            <article className="mail-settings-field-card"><strong>Webhook 通知</strong><span>{routing.webhookEnabled ? routing.webhookEndpoint : "未开启"}</span></article>
            <article className="mail-settings-field-card"><strong>Telegram 通知</strong><span>{routing.telegramEnabled ? routing.telegramChannel : "未开启"}</span></article>
            <article className="mail-settings-field-card"><strong>失败告警</strong><span>{routing.failureAlerts ? "已开启" : "未开启"}</span></article>
            <article className="mail-settings-field-card"><strong>异常 / 无匹配邮件</strong><span>{routing.exceptionStrategy}</span></article>
          </div>
        </section>

        <section className="mail-settings-section">
          <div className="mail-settings-section-head">
            <h3>工作台行为偏好</h3>
            <p>定义邮件工作台的默认进入位置和异常展开方式。</p>
          </div>
          <div className="mail-settings-field-grid">
            <article className="mail-settings-field-card"><strong>默认邮件子页面</strong><span>{workspaceDefaults.defaultMailRoute}</span></article>
            <article className="mail-settings-field-card"><strong>发件箱默认筛选</strong><span>{workspaceDefaults.outboundDefaultFilter}</span></article>
            <article className="mail-settings-field-card"><strong>默认展开异常</strong><span>{workspaceDefaults.expandExceptionsByDefault ? "是" : "否"}</span></article>
            <article className="mail-settings-field-card"><strong>列表密度</strong><span>{workspaceDefaults.listDensity}</span></article>
          </div>
        </section>
      </section>

      <aside className="panel workspace-card mail-settings-summary-panel">
        <p className="panel-kicker">策略摘要</p>
        <h2>当前策略摘要</h2>
        <dl className="mail-settings-summary-list">
          <div><dt>默认发件身份</dt><dd>{senderRules.defaultIdentity}</dd></div>
          <div><dt>失败告警</dt><dd>{routing.failureAlerts ? "开启" : "关闭"}</dd></div>
          <div><dt>Webhook / Telegram</dt><dd>{routing.webhookEnabled && routing.telegramEnabled ? "双通道已开启" : "部分开启"}</dd></div>
          <div><dt>异常邮件策略</dt><dd>{routing.exceptionStrategy}</dd></div>
        </dl>
      </aside>
    </main>
  );
}
```

Update `apps/web/src/app/AppRoutes.tsx`:

```tsx
import { MailSettingsPage } from "../features/settings/MailSettingsPage";

const mailSettingsPage = <MailSettingsPage />;
```

Add CSS for `.mail-settings-grid`, `.mail-settings-main-panel`, `.mail-settings-summary-panel`, `.mail-settings-section`, `.mail-settings-field-grid`, and `.mail-settings-summary-list`.

**Step 4: Run the tests to verify the mail settings page passes**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/mail-settings-page.test.tsx
pnpm exec playwright test -c apps/web/playwright.config.ts --grep "mail settings rule center"
```

Expected: PASS. The placeholder copy should be gone.

**Step 5: Commit the settings page**

```bash
git add   apps/web/src/features/settings/mailSettingsMockData.ts   apps/web/src/features/settings/MailSettingsPage.tsx   apps/web/src/test/integration/mail-settings-page.test.tsx   apps/web/src/app/AppRoutes.tsx   apps/web/e2e/smoke.spec.ts   apps/web/src/shared/styles/index.css

git commit -F - <<'EOF'
Replace mail settings with a rule-centric configuration center

The mail settings route now matches the approved design: it leads with sending
rules and notification/routing policy, then relegates workspace defaults to a
secondary section with a lightweight summary rail.

Constraint: The first pass must use local-state/mock configuration because no dedicated mail-settings backend contract exists yet
Rejected: Keep mail settings as cross-links to Telegram and Webhook pages | fails to give the mail section a real rule center
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Keep sender rules and notification/routing above any workspace preference controls
Tested: Targeted Vitest mail-settings integration, targeted Playwright mail-settings route smoke
Not-tested: Full suite, live backend persistence
EOF
```

### Task 5: Run the full verification stack and clean up any regressions

**Files:**
- Modify if needed: `apps/web/src/shared/styles/index.css`
- Modify if needed: any files touched above based on verification failures

**Step 1: Run targeted route and integration checks**

Run:

```bash
pnpm --dir apps/web exec vitest run   src/test/workspace-shell.test.ts   src/test/integration/outbound-page.test.tsx   src/test/integration/mail-settings-page.test.tsx
pnpm exec playwright test -c apps/web/playwright.config.ts --grep "shared access shell|outbound record center|mail settings rule center"
```

Expected: PASS.

**Step 2: Run the full web test suite**

Run:

```bash
pnpm test:web
```

Expected: PASS. This confirms the new mail-section work did not break existing inbox, accounts, announcements, or shared-shell tests.

**Step 3: Run static verification**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Expected: PASS.

**Step 4: Run the full e2e suite**

Run:

```bash
lsof -ti tcp:4173 | xargs -r kill
pnpm test:e2e
```

Expected: PASS. If the preview server is already running stale code, killing port 4173 first ensures Playwright rebuilds against the current bundle.

**Step 5: Commit any final fixes after verification**

If verification required no extra code changes, do not make an extra commit. If you had to fix regressions, commit them with a Lore message that explicitly names the regression and the verification command that caught it.
